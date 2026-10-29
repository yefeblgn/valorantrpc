import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { AgentOption, Language } from '@shared/types'
import { MEDIA, REPO_MEDIA, VALORANT_API, cacheDir } from '../constants'
import { apiLanguage } from '@shared/i18n'
import { webClient } from '../lib/http'

const CACHE_TTL = 12 * 3600 * 1000
const RETRY_DELAY = 60_000
const VERSION_TIMEOUT = 3000
const NEW_AGENT_WINDOW = 45 * 24 * 3600 * 1000
const STANDARD_MODE_UUID = '96bd3920-4f36-d026-2b28-c683eb0bcac5'
const RANGE_MODE_UUID = 'e2dc3878-4fe5-d132-28f8-3d8c259efcc6'
const EMPTY_UUID = '00000000-0000-0000-0000-000000000000'

const MODE_UUID: Record<string, string> = {
  competitive: STANDARD_MODE_UUID,
  unrated: STANDARD_MODE_UUID,
  swiftplay: '5d0f264b-4ebe-cc63-c147-809e1374484b',
  spikerush: 'e921d1e6-416b-c31f-1291-74930c330b7b',
  deathmatch: 'a8790ec5-4237-f2f0-e93b-08a8e89865b2',
  ggteam: 'a4ed6518-4741-6dcb-35bd-f884aecdc859',
  hurm: 'e086db66-47fd-e791-ca81-06a645ac7661',
  onefa: '4744698a-4513-dc96-9c22-a9aa437e4a58',
  snowball: '57038d6d-49b1-3a74-c5ef-3395d9f23a97',
  premier: STANDARD_MODE_UUID,
  custom: STANDARD_MODE_UUID,
  newmap: STANDARD_MODE_UUID,
  knockout: '1a4a3fd5-4966-62cb-7fe4-15b0317f5c80',
  ar1s: '1cd8901f-47af-49cb-d758-e2afd0eb2a39',
  mixtape: STANDARD_MODE_UUID,
  skirmish: '0e9805d8-4af6-5ffb-f467-55806a6bc484',
  ascension: 'd08c45fe-4415-edcf-65a3-45885cc4349b',
  retake: '75b7b658-472c-0264-cbe6-049abf14f54b',
  fortcollins: '75b7b658-472c-0264-cbe6-049abf14f54b',
  summit: STANDARD_MODE_UUID
}

const MODE_MEDIA: Record<string, { icon: string; art: string }> = {
  abilitydraftarena: {
    icon: `${REPO_MEDIA}/gauntlet_glitched_icon.png`,
    art: `${REPO_MEDIA}/gauntlet_glitched.jpg`
  }
}

const TEAM_HEALTH_MODES = new Set(['abilitydraftarena'])

const MODE_NAME: Record<string, Record<Language, string>> = {
  competitive: { tr: 'Rekabetçi', en: 'Competitive' },
  unrated: { tr: 'Derecesiz', en: 'Unrated' },
  swiftplay: { tr: 'Tam Gaz', en: 'Swiftplay' },
  spikerush: { tr: 'Spike Hücum', en: 'Spike Rush' },
  deathmatch: { tr: 'Ölüm Maçı', en: 'Deathmatch' },
  ggteam: { tr: 'Tırmanış', en: 'Escalation' },
  hurm: { tr: 'Takım Ölüm Maçı', en: 'Team Deathmatch' },
  onefa: { tr: 'Kopyalama', en: 'Replication' },
  snowball: { tr: 'Kartopu Savaşı', en: 'Snowball Fight' },
  premier: { tr: 'Premier', en: 'Premier' },
  custom: { tr: 'Özel Oyun', en: 'Custom Game' },
  newmap: { tr: 'Yeni Harita', en: 'New Map' },
  knockout: { tr: 'Nakavt', en: 'Knockout' },
  ar1s: { tr: 'Tek Bölge Rasgele', en: 'All Random One Site' },
  mixtape: { tr: 'Miks', en: 'Miks' },
  skirmish: { tr: 'Çarpışma', en: 'Skirmish' },
  ascension: { tr: 'Çarpışma: Yükseliş', en: 'Skirmish: Ascension' },
  retake: { tr: 'Akın', en: 'Retake' },
  fortcollins: { tr: 'Akın', en: 'Retake' },
  summit: { tr: 'Summit', en: 'Summit' },
  abilitydraftarena: { tr: 'Galeyan: Güç Bozulması', en: 'Gauntlet: Glitched' },
  '': { tr: 'Lobide', en: 'In Lobby' }
}

interface AgentEntry {
  name: string
  role: string
  released: number
}
interface ApiAgent {
  uuid: string
  displayName?: string
  releaseDate?: string
  role?: { displayName?: string } | null
}
interface MapEntry {
  name: string
  uuid: string
}
interface TierEntry {
  name: string
  icon: string | null
}
interface SeasonEntry {
  name: string
  parent: string
  start: number
  end: number
  act: boolean
}
interface ApiSeason {
  uuid: string
  displayName?: string
  type?: string | null
  startTime?: string
  endTime?: string
  parentUuid?: string | null
}

export class Content {
  private agents: Record<string, AgentEntry> | null = null
  private maps: Record<string, MapEntry> | null = null
  private tiers: Record<number, TierEntry> | null = null
  private seasons: Record<string, SeasonEntry> | null = null
  private seasonsLoading: Promise<void> | null = null
  private retryAt = 0
  private staleRetryAt = 0
  private loading: { language: Language; promise: Promise<void> } | null = null

  constructor(public language: Language = 'en') {}

  setLanguage(language: Language): void {
    if (language !== this.language) {
      this.language = language
      this.agents = this.maps = this.tiers = this.seasons = null
      this.retryAt = 0
      this.staleRetryAt = 0
    }
  }

  async ensureAll(): Promise<void> {
    if (!this.loading || this.loading.language !== this.language) {
      const language = this.language
      const promise = this.loadAll(language).finally(() => {
        if (this.loading?.promise === promise) this.loading = null
      })
      this.loading = { language, promise }
    }
    return this.loading.promise
  }

  private async loadAll(language: Language): Promise<void> {
    if (Date.now() < this.retryAt) return
    if (this.agents !== null && this.maps !== null && this.tiers !== null) return
    const version = await this.latestVersion()
    const force = !!version && version !== this.cachedVersion()
    const [agents, maps, tiers] = await Promise.all([
      this.agents ?? this.loadAgents(force),
      this.maps ?? this.loadMaps(force),
      this.tiers ?? this.loadTiers(force)
    ])
    if (language !== this.language) return
    const filled = (o: object): boolean => Object.keys(o).length > 0
    this.agents = filled(agents) ? agents : null
    this.maps = filled(maps) ? maps : null
    this.tiers = filled(tiers) ? tiers : null
    if (!this.agents || !this.maps || !this.tiers) {
      this.retryAt = Date.now() + RETRY_DELAY
      return
    }
    if (force) this.saveVersion(version)
  }

  private async latestVersion(): Promise<string> {
    try {
      const r = await webClient.get(`${VALORANT_API}/version`, { timeout: VERSION_TIMEOUT })
      if (r.status === 200) return String(r.data?.data?.version ?? '')
    } catch (e) {
      console.debug('[content] version check failed:', e)
    }
    return ''
  }

  private cachedVersion(): string {
    const vf = this.cacheFile('version')
    if (!existsSync(vf)) return ''
    try {
      return String(JSON.parse(readFileSync(vf, 'utf-8')).version ?? '')
    } catch {
      return ''
    }
  }

  private saveVersion(version: string): void {
    try {
      writeFileSync(this.cacheFile('version'), JSON.stringify({ version }), 'utf-8')
    } catch (e) {
      console.debug('[content] version save failed:', e)
    }
  }

  async ensureKnown(agentUuid: string, mapPath: string): Promise<void> {
    if (Date.now() < this.staleRetryAt) return
    const agent = agentUuid.toLowerCase().trim()
    const map = mapPath.toLowerCase().trim()
    const agentMissing = !!this.agents && !!agent && agent !== EMPTY_UUID && !(agent in this.agents)
    const mapMissing = !!this.maps && !!map && !(map in this.maps)
    if (!agentMissing && !mapMissing) return
    this.staleRetryAt = Date.now() + RETRY_DELAY
    const language = this.language
    const [agents, maps] = await Promise.all([
      agentMissing ? this.loadAgents(true) : null,
      mapMissing ? this.loadMaps(true) : null
    ])
    if (language !== this.language) return
    if (agents && Object.keys(agents).length) this.agents = agents
    if (maps && Object.keys(maps).length) this.maps = maps
  }

  private cacheFile(name: string): string {
    const dir = cacheDir()
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    return join(dir, `${name}_${this.language}.json`)
  }

  private async fetch(name: string, path: string, force = false): Promise<unknown> {
    const cf = this.cacheFile(name)
    if (!force && existsSync(cf)) {
      try {
        if (Date.now() - statSync(cf).mtimeMs < CACHE_TTL) {
          return JSON.parse(readFileSync(cf, 'utf-8'))
        }
      } catch {}
    }
    try {
      const sep = path.includes('?') ? '&' : '?'
      const url = `${VALORANT_API}${path}${sep}language=${apiLanguage(this.language)}`
      const r = await webClient.get(url)
      if (r.status === 200) {
        const data = r.data?.data
        writeFileSync(cf, JSON.stringify(data), 'utf-8')
        return data
      }
    } catch (e) {
      console.debug(`[content] fetch failed (${name}):`, e)
    }
    if (existsSync(cf)) {
      try {
        return JSON.parse(readFileSync(cf, 'utf-8'))
      } catch {}
    }
    return null
  }

  private async loadAgents(force: boolean): Promise<Record<string, AgentEntry>> {
    const agents: Record<string, AgentEntry> = {}
    const data = (await this.fetch('agents', '/agents?isPlayableCharacter=true', force)) as
      | ApiAgent[]
      | null
    for (const a of data ?? []) {
      agents[a.uuid.toLowerCase()] = {
        name: a.displayName ?? '',
        role: a.role?.displayName ?? '',
        released: Date.parse(a.releaseDate ?? '') || 0
      }
    }
    return agents
  }

  private async loadMaps(force: boolean): Promise<Record<string, MapEntry>> {
    const maps: Record<string, MapEntry> = {}
    const data = (await this.fetch('maps', '/maps', force)) as Array<Record<string, string>> | null
    for (const m of data ?? []) {
      const url = (m.mapUrl ?? '').toLowerCase()
      if (url) maps[url] = { name: m.displayName ?? '', uuid: m.uuid ?? '' }
    }
    return maps
  }

  private async loadTiers(force: boolean): Promise<Record<number, TierEntry>> {
    const tiers: Record<number, TierEntry> = {}
    const data = (await this.fetch('competitivetiers', '/competitivetiers', force)) as Array<{
      tiers: Array<Record<string, string>>
    }> | null
    if (data && data.length) {
      for (const tinfo of data[data.length - 1].tiers ?? []) {
        tiers[Number(tinfo.tier)] = {
          name: title(tinfo.tierName ?? '', apiLanguage(this.language)),
          icon: (tinfo.largeIcon as string) || null
        }
      }
    }
    return tiers
  }

  async ensureSeasons(): Promise<void> {
    if (this.seasons) return
    if (!this.seasonsLoading) {
      const language = this.language
      this.seasonsLoading = this.loadSeasons()
        .then((seasons) => {
          if (language === this.language && Object.keys(seasons).length) this.seasons = seasons
        })
        .finally(() => {
          this.seasonsLoading = null
        })
    }
    return this.seasonsLoading
  }

  private async loadSeasons(): Promise<Record<string, SeasonEntry>> {
    const seasons: Record<string, SeasonEntry> = {}
    const data = (await this.fetch('seasons', '/seasons')) as ApiSeason[] | null
    for (const s of data ?? []) {
      seasons[s.uuid.toLowerCase()] = {
        name: s.displayName ?? '',
        parent: (s.parentUuid ?? '').toLowerCase(),
        start: Date.parse(s.startTime ?? '') || 0,
        end: Date.parse(s.endTime ?? '') || 0,
        act: (s.type ?? '').endsWith('::Act')
      }
    }
    return seasons
  }

  currentAct(now = Date.now()): string {
    for (const [id, s] of Object.entries(this.seasons ?? {})) {
      if (s.act && s.start <= now && now < s.end) return id
    }
    return ''
  }

  seasonStart(id: string): number {
    return this.seasons?.[id.toLowerCase()]?.start ?? 0
  }

  actLabel(id: string): string {
    const season = this.seasons?.[id.toLowerCase()]
    if (!season) return ''
    const parent = this.seasons?.[season.parent]?.name ?? ''
    return parent ? `${parent} · ${season.name}` : season.name
  }

  playableAgents(): AgentOption[] {
    const now = Date.now()
    return Object.entries(this.agents ?? {})
      .map(([uuid, a]) => ({
        uuid,
        name: a.name,
        role: a.role,
        icon: `${MEDIA}/agents/${uuid}/displayicon.png`,
        isNew: a.released > 0 && now - a.released < NEW_AGENT_WINDOW
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  agentName(uuid: string | null | undefined): string {
    if (!uuid) return ''
    return (this.agents ?? {})[uuid.toLowerCase()]?.name ?? ''
  }

  agentIcon(uuid: string | null | undefined): string | null {
    if (!uuid) return null
    const u = uuid.toLowerCase().trim()
    if (u === '' || u === EMPTY_UUID) return null
    if (!(u in (this.agents ?? {}))) return null
    return `${MEDIA}/agents/${u}/displayicon.png`
  }

  mapInfo(mapPath: string | null | undefined): [string, string | null] {
    if (!mapPath) return ['', null]
    const entry = (this.maps ?? {})[mapPath.toLowerCase()]
    if (!entry) return ['', null]
    const splash = entry.uuid ? `${MEDIA}/maps/${entry.uuid}/splash.png` : null
    return [entry.name ?? '', splash]
  }

  tierName(tier: number | null | undefined): string {
    if (!tier) return ''
    return (this.tiers ?? {})[Number(tier)]?.name ?? ''
  }

  tierIcon(tier: number | null | undefined): string | null {
    if (tier === null || tier === undefined) return null
    return (this.tiers ?? {})[Number(tier)]?.icon ?? null
  }

  queueKey(queueId: string | null | undefined): string {
    const q = (queueId ?? '').toLowerCase().trim()
    if (q in MODE_NAME) return q
    for (const key of Object.keys(MODE_NAME)) {
      if (key && q.includes(key)) return key
    }
    return ''
  }

  modeName(queueId: string | null | undefined): string {
    const key = this.queueKey(queueId)
    if (key) {
      const names = MODE_NAME[key]
      return names[this.language] ?? names.en
    }
    const q = (queueId ?? '').trim()
    return q
      ? title(q.replace(/_/g, ' '), apiLanguage(this.language))
      : (MODE_NAME[''][this.language] ?? 'In Lobby')
  }

  modeIcon(queueId: string | null | undefined): string | null {
    const key = this.queueKey(queueId)
    if (MODE_MEDIA[key]) return MODE_MEDIA[key].icon
    const uuid = MODE_UUID[key] ?? MODE_UUID.unrated
    return uuid ? `${MEDIA}/gamemodes/${uuid}/displayicon.png` : null
  }

  modeIconUnique(queueId: string | null | undefined): string | null {
    const key = this.queueKey(queueId)
    if (MODE_MEDIA[key]) return MODE_MEDIA[key].icon
    const uuid = MODE_UUID[key]
    if (!uuid || uuid === STANDARD_MODE_UUID) return null
    return `${MEDIA}/gamemodes/${uuid}/displayicon.png`
  }

  rangeIcon(): string {
    return `${MEDIA}/gamemodes/${RANGE_MODE_UUID}/displayicon.png`
  }

  modeArt(queueId: string | null | undefined): string | null {
    return MODE_MEDIA[this.queueKey(queueId)]?.art ?? null
  }

  usesTeamHealth(queueId: string | null | undefined): boolean {
    return TEAM_HEALTH_MODES.has(this.queueKey(queueId))
  }

  cardWide(uuid: string | null | undefined): string | null {
    if (!uuid) return null
    return `${MEDIA}/playercards/${uuid}/wideart.png`
  }

  cardSquare(uuid: string | null | undefined): string | null {
    if (!uuid) return null
    return `${MEDIA}/playercards/${uuid}/smallart.png`
  }
}

function title(s: string, locale: string): string {
  return s
    .split(/(\s+)/)
    .map((w) => w.charAt(0).toLocaleUpperCase(locale) + w.slice(1).toLocaleLowerCase(locale))
    .join('')
}
