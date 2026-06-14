import { existsSync, readFileSync } from 'fs'
import type { Language } from '@shared/types'
import { valorantLogPath } from '../constants'
import type { LocalAuth } from './localAuth'

const REGION_TO_SHARD: Record<string, string> = {
  na: 'na',
  latam: 'na',
  br: 'na',
  eu: 'eu',
  ap: 'ap',
  kr: 'kr',
  pbe: 'pbe'
}

const GLZ_RE = /glz-([\w-]+?)-1\.([\w-]+)\.a\.pvp\.net/
const PD_RE = /https:\/\/pd\.([\w-]+)\.a\.pvp\.net/


export async function detectRegionShard(auth: LocalAuth): Promise<[string, string]> {
  try {
    const path = valorantLogPath()
    if (existsSync(path)) {
      const txt = readFileSync(path, 'utf-8')
      const m = txt.match(GLZ_RE)
      if (m) return [m[1], m[2]]
      const mpd = txt.match(PD_RE)
      if (mpd) {
        const shard = mpd[1]
        return [shard, shard]
      }
    }
  } catch (e) {
    console.debug('[region] log parse failed:', e)
  }

  try {
    const r = await auth.localGet('/chat/v1/session')
    if (r.status === 200) {
      const region = String(r.data.region || '')
        .toLowerCase()
        .replace('1', '')
      if (region) return [region, REGION_TO_SHARD[region] ?? region]
    }
  } catch (e) {
    console.debug('[region] chat session failed:', e)
  }

  console.warn('[region] detection failed, defaulting to eu')
  return ['eu', 'eu']
}

export async function detectLocale(auth: LocalAuth): Promise<Language> {
  try {
    const r = await auth.localGet('/riotclient/region-locale')
    if (r.status === 200) {
      const locale = String(r.data.locale || '').toLowerCase()
      if (locale.startsWith('tr')) return 'tr'
    }
  } catch (e) {
    console.debug('[region] locale failed:', e)
  }
  return 'en'
}

export async function detectPlayer(auth: LocalAuth): Promise<[string, string]> {
  try {
    const r = await auth.localGet('/chat/v1/session')
    if (r.status === 200) return [r.data.game_name || '', r.data.game_tag || '']
  } catch (e) {
    console.debug('[region] player failed:', e)
  }
  return ['', '']
}
