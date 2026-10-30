import { EventEmitter } from 'events'
import {
  TEAM_QUEUES,
  sessionOf,
  type HistoryData,
  type HistoryStatus,
  type MatchDetail,
  type MatchSummary,
  type RrEntry,
  type SessionSummary
} from '@shared/history'
import type { CompetitiveUpdate, HistoryEntry, RiotApi } from '../riot/api'
import { parseMatch, summarize } from './parse'
import { HistoryStore } from './store'

const SYNC_INTERVAL = 10 * 60 * 1000
const RETRY_INTERVAL = 60 * 1000
const PAGE = 20
const INITIAL_DEPTH = 100
const BACKFILL_STEP = 60
const RR_DEPTH = 100
const DETAIL_GAP = 350
const RECENT = 3 * 3600 * 1000
const AFTER_MATCH_RETRY = 30_000
const AFTER_MATCH_TRIES = 6
const TOP_AGENTS = 3

export interface MapRecord {
  sample: number
  agents: { agent: string; games: number; wins: number }[]
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function toRr(u: CompetitiveUpdate): RrEntry {
  return {
    id: u.matchId,
    start: u.start,
    season: u.season,
    map: u.map,
    change: u.change,
    before: u.before,
    after: u.after,
    tierBefore: u.tierBefore,
    tier: u.tier
  }
}

export class HistoryService extends EventEmitter {
  readonly store = new HistoryStore()
  private connected = false
  private busy = false
  private synced = false
  private nextSync = 0
  private backfill = 0
  private awaiting = 0
  private error: string | null = null

  get puuid(): string {
    return this.store.current
  }

  setAccount(puuid: string, name: string, tag: string): void {
    if (!puuid) return
    const switched = puuid !== this.store.current
    this.store.touchAccount(puuid, name, tag)
    if (!switched) return
    this.store.open(puuid)
    this.synced = false
    this.nextSync = 0
    this.emit('changed')
  }

  setConnected(connected: boolean): void {
    if (connected === this.connected) return
    this.connected = connected
    this.emit('changed')
  }

  importFrom(path: string): number {
    const added = this.store.importFrom(path)
    this.emit('changed')
    return added
  }

  exportTo(path: string): number {
    return this.store.exportTo(path)
  }

  requestSync(afterMatch = false): void {
    this.nextSync = 0
    if (afterMatch) this.awaiting = AFTER_MATCH_TRIES
  }

  requestBackfill(): void {
    this.backfill += BACKFILL_STEP
    this.nextSync = 0
  }

  tick(api: RiotApi, allowed: boolean): void {
    if (!allowed || this.busy || !this.puuid || Date.now() < this.nextSync) return
    void this.run(api, this.puuid)
  }

  isReady(): boolean {
    return this.synced || this.store.state.matches.length > 0
  }

  status(): HistoryStatus {
    const idx = this.store.state
    return {
      puuid: this.puuid,
      accounts: this.store.accounts,
      connected: this.connected,
      syncing: this.busy,
      total: idx.matches.length,
      lastSync: idx.lastSync,
      canBackfill: !idx.exhausted,
      error: this.error
    }
  }

  data(puuid = this.puuid): HistoryData {
    return { puuid, matches: this.store.summaries(puuid), rr: this.store.rrEntries(puuid) }
  }

  detail(id: string, puuid = this.puuid): MatchDetail | null {
    return this.store.detail(id, puuid)
  }

  queues(): string[] {
    return [...new Set(this.store.state.matches.map((m) => m.queue))]
  }

  teamMatches(): MatchSummary[] {
    return this.store.state.matches.filter((m) => !m.custom && TEAM_QUEUES.includes(m.queue))
  }

  session(): SessionSummary | null {
    return sessionOf(this.store.state.matches.filter((m) => !m.custom))
  }

  forMap(mapPath: string): MapRecord {
    const map = mapPath.toLowerCase()
    const all = this.teamMatches()
    const byAgent = new Map<string, { agent: string; games: number; wins: number }>()
    for (const m of all) {
      if (m.map !== map) continue
      const rec = byAgent.get(m.agent) ?? { agent: m.agent, games: 0, wins: 0 }
      rec.games++
      if (m.result === 'win') rec.wins++
      byAgent.set(m.agent, rec)
    }
    const agents = [...byAgent.values()]
      .sort((a, b) => b.games - a.games || b.wins / b.games - a.wins / a.games)
      .slice(0, TOP_AGENTS)
    return { sample: all.length, agents }
  }

  private async run(api: RiotApi, puuid: string): Promise<void> {
    this.busy = true
    this.error = null
    this.emit('changed')
    const firstSync = this.store.state.lastSync === null
    const added: MatchSummary[] = []
    let ok = false
    try {
      await this.syncRr(api, puuid)
      const ids = await this.scan(api, puuid)
      for (const [i, id] of ids.entries()) {
        if (puuid !== this.puuid) return
        const raw = await api.matchDetails(id)
        if (puuid !== this.puuid) return
        if (raw) {
          const detail = parseMatch(raw)
          const summary = detail ? summarize(detail, puuid) : null
          if (detail && summary) {
            this.store.addMatch(summary, detail)
            added.push(summary)
          } else {
            this.store.skip(id)
          }
        }
        if (i % 5 === 4) {
          this.store.save()
          this.emit('changed')
        }
        await sleep(DETAIL_GAP)
      }
      ok = true
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e)
      console.debug('[history] sync error:', e)
    } finally {
      this.busy = false
      if (puuid === this.puuid) {
        if (ok) {
          this.synced = true
          this.store.state.lastSync = Date.now()
        }
        this.nextSync = Date.now() + (ok ? SYNC_INTERVAL : RETRY_INTERVAL)
        if (added.length) {
          this.awaiting = 0
        } else if (this.awaiting > 0) {
          this.awaiting--
          this.nextSync = Date.now() + AFTER_MATCH_RETRY
        }
        this.store.save()
        const fresh = added
          .filter((m) => Date.now() - (m.start + m.length) < RECENT)
          .sort((a, b) => b.start - a.start)
        this.emit('changed')
        if (!firstSync && fresh.length) this.emit('newMatches', fresh)
      }
    }
  }

  private async syncRr(api: RiotApi, puuid: string): Promise<void> {
    const entries: RrEntry[] = []
    for (let start = 0; start < RR_DEPTH; start += PAGE) {
      const page = await api.competitiveUpdates(puuid, start, start + PAGE)
      if (!page) break
      const fresh = page.filter((u) => !this.store.knownRr(u.matchId))
      entries.push(...page.map(toRr))
      if (page.length < PAGE || fresh.length === 0) break
    }
    if (entries.length) this.store.mergeRr(entries)
  }

  private async scan(api: RiotApi, puuid: string): Promise<string[]> {
    const idx = this.store.state
    const wanted: string[] = []
    const seen = new Set<string>()
    const collect = (page: HistoryEntry[]): number => {
      let fresh = 0
      for (const e of page) {
        if (this.store.has(e.matchId) || seen.has(e.matchId)) continue
        seen.add(e.matchId)
        wanted.push(e.matchId)
        fresh++
      }
      return fresh
    }

    const initial = idx.depth === 0
    const limit = initial ? INITIAL_DEPTH : Number.MAX_SAFE_INTEGER
    let scanned = 0
    let headFresh = 0
    for (let start = 0; start < limit; start += PAGE) {
      const page = await api.historyPage(puuid, start, start + PAGE)
      if (!page) {
        if (start === 0) throw new Error('match history unavailable')
        break
      }
      scanned = start + page.length
      const fresh = collect(page)
      headFresh += fresh
      if (page.length < PAGE) {
        idx.exhausted = true
        break
      }
      if (!initial && fresh === 0) break
    }
    idx.depth = initial ? scanned : idx.depth + headFresh

    if (this.backfill > 0 && !idx.exhausted) {
      const from = Math.max(0, idx.depth - PAGE)
      const to = idx.depth + this.backfill
      for (let start = from; start < to; start += PAGE) {
        const page = await api.historyPage(puuid, start, start + PAGE)
        if (!page) break
        collect(page)
        idx.depth = Math.max(idx.depth, start + page.length)
        if (page.length < PAGE) {
          idx.exhausted = true
          break
        }
      }
    }
    this.backfill = 0
    return wanted
  }
}
