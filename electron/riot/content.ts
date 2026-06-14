import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { AgentOption, Language } from '@shared/types'
import { MEDIA, VALORANT_API, cacheDir } from '../constants'
import { apiLanguage } from '@shared/i18n'
import { webClient } from '../lib/http'

const CACHE_TTL = 12 * 3600 * 1000 
const STANDARD_MODE_UUID = '96bd3920-4f36-d026-2b28-c683eb0bcac5'

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
  ascension: 'd08c45fe-4415-edcf-65a3-45885cc4349b'
}

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
  '': { tr: 'Lobide', en: 'In Lobby' }
}

interface MapEntry {
  name: string
  uuid: string
}
interface TierEntry {
  name: string
  icon: string | null
}


export class Content {
  private agents: Record<string, string> | null = null
  private maps: Record<string, MapEntry> | null = null
  private tiers: Record<number, TierEntry> | null = null

  constructor(public language: Language = 'en') {}

  setLanguage(language: Language): void {
    if (language !== this.language) {
      this.language = language
      this.agents = this.maps = this.tiers = null
    }
  }

  
  async ensureAll(): Promise<void> {
    await Promise.all([this.ensureAgents(), this.ensureMaps(), this.ensureTiers()])
  }

  private cacheFile(name: string): string {
    const dir = cacheDir()
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    return join(dir, `${name}_${this.language}.json`)
  }

  private async fetch(name: string, path: string): Promise<unknown> {
    const cf = this.cacheFile(name)
    if (existsSync(cf)) {
      try {
        if (Date.now() - statSync(cf).mtimeMs < CACHE_TTL) {
          return JSON.parse(readFileSync(cf, 'utf-8'))
        }
      } catch {
        
      }
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
      } catch {
        
      }
    }
    return null
  }

  private async ensureAgents(): Promise<Record<string, string>> {
    if (this.agents === null) {
      this.agents = {}
      const data = (await this.fetch('agents', '/agents?isPlayableCharacter=true')) as
        | Array<Record<string, string>>
        | null
      for (const a of data ?? []) {
        this.agents[a.uuid.toLowerCase()] = a.displayName ?? ''
      }
    }
    return this.agents
  }

  private async ensureMaps(): Promise<Record<string, MapEntry>> {
    if (this.maps === null) {
      this.maps = {}
      const data = (await this.fetch('maps', '/maps')) as Array<Record<string, string>> | null
      for (const m of data ?? []) {
        const url = (m.mapUrl ?? '').toLowerCase()
        if (url) this.maps[url] = { name: m.displayName ?? '', uuid: m.uuid ?? '' }
      }
    }
    return this.maps
  }

  private async ensureTiers(): Promise<Record<number, TierEntry>> {
    if (this.tiers === null) {
      this.tiers = {}
      const data = (await this.fetch('competitivetiers', '/competitivetiers')) as Array<{
        tiers: Array<Record<string, string>>
      }> | null
      if (data && data.length) {
        for (const tinfo of data[data.length - 1].tiers ?? []) {
          const tierNum = Number(tinfo.tier)
          this.tiers[tierNum] = {
            name: title(tinfo.tierName ?? ''),
            icon: (tinfo.largeIcon as string) || null
          }
        }
      }
    }
    return this.tiers
  }

  
  playableAgents(): AgentOption[] {
    const dict = this.agents ?? {}
    return Object.entries(dict)
      .map(([uuid, name]) => ({ uuid, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  agentName(uuid: string | null | undefined): string {
    if (!uuid) return ''
    return (this.agents ?? {})[uuid.toLowerCase()] ?? ''
  }

  agentIcon(uuid: string | null | undefined): string | null {
    if (!uuid) return null
    const u = uuid.toLowerCase().trim()
    if (u === '' || u === '00000000-0000-0000-0000-000000000000') return null
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
    return q ? title(q.replace(/_/g, ' ')) : MODE_NAME[''][this.language] ?? 'In Lobby'
  }

  modeIcon(queueId: string | null | undefined): string | null {
    const key = this.queueKey(queueId)
    const uuid = MODE_UUID[key] ?? MODE_UUID.unrated
    return uuid ? `${MEDIA}/gamemodes/${uuid}/displayicon.png` : null
  }

  modeIconUnique(queueId: string | null | undefined): string | null {
    const key = this.queueKey(queueId)
    const uuid = MODE_UUID[key]
    if (!uuid || uuid === STANDARD_MODE_UUID) return null
    return `${MEDIA}/gamemodes/${uuid}/displayicon.png`
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

function title(s: string): string {
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}
