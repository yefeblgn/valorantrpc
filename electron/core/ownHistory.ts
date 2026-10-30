import { EventEmitter } from 'events'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { join } from 'path'
import { cacheDir } from '../constants'
import type { RiotApi } from '../riot/api'

const SYNC_INTERVAL = 10 * 60 * 1000
const RETRY_INTERVAL = 60 * 1000
const PAGE_SIZE = 20
const DEPTH = 60
const KEEP = 200
const SKIP_KEEP = 300
const DETAIL_GAP = 350
const TOP_AGENTS = 3
const TEAM_QUEUES = new Set(['competitive', 'unrated', 'swiftplay', 'premier', 'newmap'])

type Json = Record<string, any>

interface OwnMatch {
  map: string
  agent: string
  won: boolean
  at: number
}

interface Store {
  version: 1
  matches: Record<string, OwnMatch>
  skipped: string[]
}

export interface AgentRecord {
  agent: string
  games: number
  wins: number
}

export interface MapRecord {
  sample: number
  agents: AgentRecord[]
}

function emptyStore(): Store {
  return { version: 1, matches: {}, skipped: [] }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function summarize(data: Json, puuid: string): OwnMatch | null {
  const info: Json = data.matchInfo ?? {}
  if (info.isCompleted === false) return null
  const map = String(info.mapId ?? '').toLowerCase()
  const me = ((data.players ?? []) as Json[]).find((p) => p.subject === puuid)
  if (!map || !me?.characterId) return null
  const team = ((data.teams ?? []) as Json[]).find((tm) => tm.teamId === me.teamId)
  return {
    map,
    agent: String(me.characterId).toLowerCase(),
    won: team?.won === true,
    at: Number(info.gameStartMillis ?? 0)
  }
}

export class OwnHistory extends EventEmitter {
  private puuid = ''
  private store: Store = emptyStore()
  private busy = false
  private synced = false
  private nextSync = 0

  hasPlayer(): boolean {
    return !!this.puuid
  }

  isReady(): boolean {
    return this.synced || Object.keys(this.store.matches).length > 0
  }

  setPlayer(puuid: string): void {
    if (puuid === this.puuid) return
    this.puuid = puuid
    this.store = puuid ? this.load(puuid) : emptyStore()
    this.synced = false
    this.nextSync = 0
    this.emit('updated')
  }

  requestSync(): void {
    this.nextSync = 0
  }

  sync(api: RiotApi): void {
    if (!this.puuid || this.busy || Date.now() < this.nextSync) return
    void this.run(api, this.puuid)
  }

  forMap(mapPath: string): MapRecord {
    const map = mapPath.toLowerCase()
    const all = Object.values(this.store.matches)
    const byAgent = new Map<string, AgentRecord>()
    for (const m of all) {
      if (m.map !== map) continue
      const rec = byAgent.get(m.agent) ?? { agent: m.agent, games: 0, wins: 0 }
      rec.games++
      if (m.won) rec.wins++
      byAgent.set(m.agent, rec)
    }
    const agents = [...byAgent.values()]
      .sort((a, b) => b.games - a.games || b.wins / b.games - a.wins / a.games)
      .slice(0, TOP_AGENTS)
    return { sample: all.length, agents }
  }

  private async run(api: RiotApi, puuid: string): Promise<void> {
    this.busy = true
    let ok = false
    try {
      const known = new Set([...Object.keys(this.store.matches), ...this.store.skipped])
      const wanted: string[] = []
      for (let start = 0; start < DEPTH; start += PAGE_SIZE) {
        const page = await api.historyPage(puuid, start, start + PAGE_SIZE)
        if (!page) {
          if (start === 0) return
          break
        }
        for (const entry of page) {
          if (known.has(entry.matchId)) continue
          if (TEAM_QUEUES.has(entry.queueId.toLowerCase())) wanted.push(entry.matchId)
          else this.store.skipped.push(entry.matchId)
        }
        if (page.length < PAGE_SIZE) break
      }

      for (const [i, id] of wanted.entries()) {
        if (puuid !== this.puuid) return
        const data = await api.matchDetails(id)
        if (puuid !== this.puuid) return
        if (data) {
          const entry = summarize(data, puuid)
          if (entry) this.store.matches[id] = entry
          else this.store.skipped.push(id)
          if (i % 5 === 4) this.emit('updated')
        }
        await sleep(DETAIL_GAP)
      }
      ok = true
    } catch (e) {
      console.debug('[history] sync error:', e)
    } finally {
      this.busy = false
      if (puuid === this.puuid) {
        if (ok) this.synced = true
        this.nextSync = Date.now() + (ok ? SYNC_INTERVAL : RETRY_INTERVAL)
        this.prune()
        this.save(puuid)
        this.emit('updated')
      }
    }
  }

  private prune(): void {
    const entries = Object.entries(this.store.matches)
    if (entries.length > KEEP) {
      entries.sort((a, b) => b[1].at - a[1].at)
      this.store.matches = Object.fromEntries(entries.slice(0, KEEP))
    }
    if (this.store.skipped.length > SKIP_KEEP) {
      this.store.skipped = this.store.skipped.slice(-SKIP_KEEP)
    }
  }

  private file(puuid: string): string {
    const dir = cacheDir()
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    return join(dir, `history_${puuid.replace(/[^a-z0-9-]/gi, '')}.json`)
  }

  private load(puuid: string): Store {
    try {
      const path = this.file(puuid)
      if (!existsSync(path)) return emptyStore()
      const data = JSON.parse(readFileSync(path, 'utf-8')) as Partial<Store>
      if (data.version !== 1 || !data.matches) return emptyStore()
      return {
        version: 1,
        matches: data.matches,
        skipped: Array.isArray(data.skipped) ? data.skipped : []
      }
    } catch (e) {
      console.debug('[history] load error:', e)
      return emptyStore()
    }
  }

  private save(puuid: string): void {
    try {
      const path = this.file(puuid)
      const tmp = `${path}.tmp`
      writeFileSync(tmp, JSON.stringify(this.store), 'utf-8')
      renameSync(tmp, path)
    } catch (e) {
      console.debug('[history] save error:', e)
    }
  }
}
