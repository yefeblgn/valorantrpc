import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync
} from 'fs'
import { join } from 'path'
import { gunzipSync, gzipSync } from 'zlib'
import { app } from 'electron'
import type { HistoryAccount, MatchDetail, MatchSummary, RrEntry } from '@shared/history'
import { cacheDir } from '../constants'

const SCHEMA = 1
const EXPORT_FORMAT = 'valorantrpc-history'
const MAX_MATCHES = 3000
const MAX_SKIPPED = 600

type Json = Record<string, any>

export interface IndexFile {
  version: number
  matches: MatchSummary[]
  rr: RrEntry[]
  skipped: string[]
  lastSync: number | null
  depth: number
  exhausted: boolean
}

interface MetaFile {
  version: number
  accounts: HistoryAccount[]
  last: string
}

function emptyIndex(): IndexFile {
  return {
    version: SCHEMA,
    matches: [],
    rr: [],
    skipped: [],
    lastSync: null,
    depth: 0,
    exhausted: false
  }
}

function safeId(id: string): string {
  return id.replace(/[^a-z0-9-]/gi, '')
}

function writeAtomic(path: string, data: string | Buffer, backup = false): void {
  const tmp = `${path}.tmp`
  writeFileSync(tmp, data)
  if (backup && existsSync(path)) copyFileSync(path, `${path}.bak`)
  renameSync(tmp, path)
}

function migrateIndex(raw: Json): IndexFile | null {
  const version = Number(raw?.version ?? 0)
  if (version > SCHEMA) return null
  if (version === 1) {
    return {
      version: SCHEMA,
      matches: Array.isArray(raw.matches) ? raw.matches : [],
      rr: Array.isArray(raw.rr) ? raw.rr : [],
      skipped: Array.isArray(raw.skipped) ? raw.skipped : [],
      lastSync: typeof raw.lastSync === 'number' ? raw.lastSync : null,
      depth: Number(raw.depth ?? 0),
      exhausted: raw.exhausted === true
    }
  }
  return emptyIndex()
}

export class HistoryStore {
  private readonly root = join(app.getPath('userData'), 'data')
  private meta: MetaFile = { version: SCHEMA, accounts: [], last: '' }
  private index: IndexFile = emptyIndex()
  private puuid = ''
  private readOnly = false

  constructor() {
    try {
      mkdirSync(this.root, { recursive: true })
      const metaPath = join(this.root, 'meta.json')
      if (existsSync(metaPath)) {
        const raw = JSON.parse(readFileSync(metaPath, 'utf-8')) as Partial<MetaFile>
        this.meta = {
          version: SCHEMA,
          accounts: Array.isArray(raw.accounts) ? raw.accounts : [],
          last: String(raw.last ?? '')
        }
      }
      this.removeLegacyCache()
    } catch (e) {
      console.warn('[history] meta load failed:', e)
    }
    if (this.meta.last) this.open(this.meta.last)
  }

  get current(): string {
    return this.puuid
  }

  get accounts(): HistoryAccount[] {
    return [...this.meta.accounts].sort((a, b) => b.lastSeen - a.lastSeen)
  }

  get state(): IndexFile {
    return this.index
  }

  touchAccount(puuid: string, name: string, tag: string): void {
    const existing = this.meta.accounts.find((a) => a.puuid === puuid)
    if (existing) {
      existing.lastSeen = Date.now()
      if (name) existing.name = name
      if (tag) existing.tag = tag
    } else {
      this.meta.accounts.push({ puuid, name, tag, lastSeen: Date.now() })
    }
    this.meta.last = puuid
    this.saveMeta()
  }

  open(puuid: string): void {
    if (!puuid || puuid === this.puuid) return
    this.puuid = puuid
    this.readOnly = false
    this.index = this.loadIndex(puuid)
  }

  has(id: string): boolean {
    return this.index.matches.some((m) => m.id === id) || this.index.skipped.includes(id)
  }

  addMatch(summary: MatchSummary, detail: MatchDetail): void {
    try {
      mkdirSync(this.matchDir(this.puuid), { recursive: true })
      writeFileSync(this.detailPath(this.puuid, detail.id), gzipSync(JSON.stringify(detail)))
    } catch (e) {
      console.warn('[history] detail write failed:', e)
      return
    }
    const rr = this.index.rr.find((r) => r.id === summary.id) ?? null
    this.index.matches = [
      { ...summary, rr },
      ...this.index.matches.filter((m) => m.id !== summary.id)
    ].sort((a, b) => b.start - a.start)
  }

  skip(id: string): void {
    if (!this.index.skipped.includes(id)) this.index.skipped.push(id)
  }

  mergeRr(entries: RrEntry[]): number {
    let added = 0
    const byId = new Map(this.index.rr.map((r) => [r.id, r]))
    for (const e of entries) {
      if (!byId.has(e.id)) added++
      byId.set(e.id, e)
    }
    this.index.rr = [...byId.values()].sort((a, b) => b.start - a.start)
    this.index.matches = this.index.matches.map((m) => ({ ...m, rr: byId.get(m.id) ?? m.rr }))
    return added
  }

  knownRr(id: string): boolean {
    return this.index.rr.some((r) => r.id === id)
  }

  detail(id: string, puuid = this.puuid): MatchDetail | null {
    try {
      const path = this.detailPath(puuid, id)
      if (!existsSync(path)) return null
      const parsed = JSON.parse(gunzipSync(readFileSync(path)).toString('utf-8')) as MatchDetail
      return parsed?.version === 1 ? parsed : null
    } catch (e) {
      console.warn('[history] detail read failed:', e)
      return null
    }
  }

  summaries(puuid = this.puuid): MatchSummary[] {
    if (puuid === this.puuid) return this.index.matches
    return this.loadIndex(puuid).matches
  }

  rrEntries(puuid = this.puuid): RrEntry[] {
    if (puuid === this.puuid) return this.index.rr
    return this.loadIndex(puuid).rr
  }

  save(): void {
    if (!this.puuid || this.readOnly) return
    const idx = this.index
    if (idx.matches.length > MAX_MATCHES) {
      for (const m of idx.matches.slice(MAX_MATCHES)) this.removeDetail(m.id)
      idx.matches = idx.matches.slice(0, MAX_MATCHES)
    }
    if (idx.skipped.length > MAX_SKIPPED) idx.skipped = idx.skipped.slice(-MAX_SKIPPED)
    try {
      mkdirSync(this.accountDir(this.puuid), { recursive: true })
      writeAtomic(this.indexPath(this.puuid), JSON.stringify(idx), true)
    } catch (e) {
      console.warn('[history] index save failed:', e)
    }
  }

  exportTo(path: string): number {
    const data: Json = {}
    let count = 0
    for (const account of this.meta.accounts) {
      const index = account.puuid === this.puuid ? this.index : this.loadIndex(account.puuid)
      const details: Record<string, MatchDetail> = {}
      for (const m of index.matches) {
        const detail = this.detail(m.id, account.puuid)
        if (detail) details[m.id] = detail
      }
      count += index.matches.length
      data[account.puuid] = { index, details }
    }
    const payload = {
      format: EXPORT_FORMAT,
      version: SCHEMA,
      exported: Date.now(),
      accounts: this.meta.accounts,
      data
    }
    writeFileSync(path, gzipSync(JSON.stringify(payload)))
    return count
  }

  importFrom(path: string): number {
    const buf = readFileSync(path)
    let text: string
    try {
      text = gunzipSync(buf).toString('utf-8')
    } catch {
      text = buf.toString('utf-8')
    }
    const payload = JSON.parse(text) as Json
    if (payload?.format !== EXPORT_FORMAT || Number(payload.version) > SCHEMA) {
      throw new Error('unsupported backup')
    }
    let added = 0
    for (const account of (payload.accounts ?? []) as HistoryAccount[]) {
      if (!account?.puuid) continue
      const entry: Json = payload.data?.[account.puuid] ?? {}
      const incoming = migrateIndex(entry.index ?? {}) ?? emptyIndex()
      const current = account.puuid === this.puuid ? this.index : this.loadIndex(account.puuid)
      const known = new Set(current.matches.map((m) => m.id))
      mkdirSync(this.matchDir(account.puuid), { recursive: true })
      for (const m of incoming.matches) {
        const detail = entry.details?.[m.id] as MatchDetail | undefined
        if (known.has(m.id) || detail?.version !== 1) continue
        writeFileSync(this.detailPath(account.puuid, m.id), gzipSync(JSON.stringify(detail)))
        current.matches.push(m)
        added++
      }
      current.matches.sort((a, b) => b.start - a.start)
      const rr = new Map(current.rr.map((r) => [r.id, r]))
      for (const r of incoming.rr) if (!rr.has(r.id)) rr.set(r.id, r)
      current.rr = [...rr.values()].sort((a, b) => b.start - a.start)
      writeAtomic(this.indexPath(account.puuid), JSON.stringify(current), true)
      if (!this.meta.accounts.some((a) => a.puuid === account.puuid)) {
        this.meta.accounts.push({ ...account })
      }
    }
    if (!this.meta.last && this.meta.accounts[0]) this.meta.last = this.meta.accounts[0].puuid
    this.saveMeta()
    if (this.puuid) {
      const reopen = this.puuid
      this.puuid = ''
      this.open(reopen)
    } else if (this.meta.last) {
      this.open(this.meta.last)
    }
    return added
  }

  private loadIndex(puuid: string): IndexFile {
    const path = this.indexPath(puuid)
    for (const candidate of [path, `${path}.bak`]) {
      if (!existsSync(candidate)) continue
      try {
        const migrated = migrateIndex(JSON.parse(readFileSync(candidate, 'utf-8')))
        if (!migrated) {
          if (puuid === this.puuid) this.readOnly = true
          console.warn('[history] index is from a newer version; opening read-only')
          return emptyIndex()
        }
        return migrated
      } catch (e) {
        console.warn(`[history] index unreadable (${candidate}):`, e)
      }
    }
    return emptyIndex()
  }

  private saveMeta(): void {
    try {
      mkdirSync(this.root, { recursive: true })
      writeAtomic(join(this.root, 'meta.json'), JSON.stringify(this.meta))
    } catch (e) {
      console.warn('[history] meta save failed:', e)
    }
  }

  private removeDetail(id: string): void {
    try {
      const path = this.detailPath(this.puuid, id)
      if (existsSync(path)) unlinkSync(path)
    } catch (e) {
      console.debug('[history] detail remove failed:', e)
    }
  }

  private removeLegacyCache(): void {
    try {
      const dir = cacheDir()
      if (!existsSync(dir)) return
      for (const file of readdirSync(dir)) {
        if (/^history_.*\.json$/.test(file)) unlinkSync(join(dir, file))
      }
    } catch (e) {
      console.debug('[history] legacy cleanup failed:', e)
    }
  }

  private accountDir(puuid: string): string {
    return join(this.root, safeId(puuid))
  }

  private matchDir(puuid: string): string {
    return join(this.accountDir(puuid), 'matches')
  }

  private indexPath(puuid: string): string {
    return join(this.accountDir(puuid), 'index.json')
  }

  private detailPath(puuid: string, id: string): string {
    return join(this.matchDir(puuid), `${safeId(id)}.json.gz`)
  }
}
