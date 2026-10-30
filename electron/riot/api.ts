import type { AxiosResponse } from 'axios'
import { riotClient } from '../lib/http'
import { isRangeFlow } from '../core/state'
import type { LocalAuth } from './localAuth'

export interface MatchPhase {
  phase: 'ingame' | 'pregame'
  agent: string | null
  match_id?: string
  queue_id?: string
  provisioning_flow?: string
  map?: string
}

export interface PartyInfo {
  state: string
  queueId: string
  members: string[]
}

export interface HistoryEntry {
  matchId: string
  queueId: string
  startTime: number
}

export interface PlayerName {
  puuid: string
  name: string
  tag: string
}

type Json = Record<string, any>

interface CoreInfo {
  agent: string | null
  match_id?: string
  provisioning_flow?: string
  map?: string
}

const RETRY_LIMIT = 3
const RETRY_FALLBACK = 1500
const RETRY_MAX_WAIT = 6000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class RiotApi {
  constructor(
    private auth: LocalAuth,
    public region: string,
    public shard: string
  ) {}

  get pd(): string {
    return `https://pd.${this.shard}.a.pvp.net`
  }

  get glz(): string {
    return `https://glz-${this.region}-1.${this.shard}.a.pvp.net`
  }

  remoteGet(url: string, timeout = 6000): Promise<AxiosResponse> {
    return riotClient.get(url, { headers: this.auth.pdGlzHeaders(), timeout })
  }

  remotePost(url: string, data: unknown = undefined, timeout = 6000): Promise<AxiosResponse> {
    return riotClient.post(url, data, { headers: this.auth.pdGlzHeaders(), timeout })
  }

  remotePut(url: string, data: unknown, timeout = 6000): Promise<AxiosResponse> {
    return riotClient.put(url, data, { headers: this.auth.pdGlzHeaders(), timeout })
  }

  private async fetchJson(request: () => Promise<AxiosResponse>): Promise<any | null> {
    for (let attempt = 1; attempt <= RETRY_LIMIT; attempt++) {
      const r = await request()
      if (r.status === 200) return r.data ?? null
      if (r.status !== 429 || attempt === RETRY_LIMIT) return null
      const header = Number(r.headers?.['retry-after'])
      const wait = header > 0 ? header * 1000 : RETRY_FALLBACK * attempt
      await sleep(Math.min(wait, RETRY_MAX_WAIT))
    }
    return null
  }

  async matchRoster(phase: 'pregame' | 'ingame', matchId: string): Promise<Json | null> {
    const base = phase === 'pregame' ? 'pregame' : 'core-game'
    try {
      return await this.fetchJson(() => this.remoteGet(`${this.glz}/${base}/v1/matches/${matchId}`))
    } catch (e) {
      console.debug('[api] roster error:', e)
      return null
    }
  }

  async playerNames(puuids: string[]): Promise<PlayerName[]> {
    if (!puuids.length) return []
    try {
      const data = await this.fetchJson(() =>
        this.remotePut(`${this.pd}/name-service/v2/players`, puuids)
      )
      return ((data ?? []) as Json[]).map((p) => ({
        puuid: String(p.Subject ?? ''),
        name: String(p.GameName ?? ''),
        tag: String(p.TagLine ?? '')
      }))
    } catch (e) {
      console.debug('[api] names error:', e)
      return []
    }
  }

  async playerMmr(puuid: string): Promise<Json | null> {
    try {
      return await this.fetchJson(() => this.remoteGet(`${this.pd}/mmr/v1/players/${puuid}`))
    } catch (e) {
      console.debug('[api] player mmr error:', e)
      return null
    }
  }

  async matchHistory(puuid: string, count: number): Promise<string[] | null> {
    const url = `${this.pd}/match-history/v1/history/${puuid}?startIndex=0&endIndex=${count}&queue=competitive`
    try {
      const data = await this.fetchJson(() => this.remoteGet(url))
      if (!data) return null
      return ((data.History ?? []) as Json[]).map((m) => String(m.MatchID ?? '')).filter(Boolean)
    } catch (e) {
      console.debug('[api] history error:', e)
      return null
    }
  }

  async historyPage(puuid: string, start: number, end: number): Promise<HistoryEntry[] | null> {
    const url = `${this.pd}/match-history/v1/history/${puuid}?startIndex=${start}&endIndex=${end}`
    try {
      const data = await this.fetchJson(() => this.remoteGet(url))
      if (!data) return null
      return ((data.History ?? []) as Json[])
        .map((m) => ({
          matchId: String(m.MatchID ?? ''),
          queueId: String(m.QueueID ?? ''),
          startTime: Number(m.GameStartTime ?? 0)
        }))
        .filter((m) => m.matchId)
    } catch (e) {
      console.debug('[api] history page error:', e)
      return null
    }
  }

  async matchDetails(matchId: string): Promise<Json | null> {
    try {
      return await this.fetchJson(() =>
        this.remoteGet(`${this.pd}/match-details/v1/matches/${matchId}`, 10000)
      )
    } catch (e) {
      console.debug('[api] match details error:', e)
      return null
    }
  }

  async selectAgent(matchId: string, agentUuid: string): Promise<boolean> {
    try {
      const r = await this.remotePost(
        `${this.glz}/pregame/v1/matches/${matchId}/select/${agentUuid}`
      )
      return r.status === 200
    } catch (e) {
      console.debug('[api] selectAgent error:', e)
      return false
    }
  }

  async lockAgent(matchId: string, agentUuid: string): Promise<boolean> {
    try {
      const r = await this.remotePost(`${this.glz}/pregame/v1/matches/${matchId}/lock/${agentUuid}`)
      return r.status === 200
    } catch (e) {
      console.debug('[api] lockAgent error:', e)
      return false
    }
  }

  async selfPresence(): Promise<Record<string, unknown> | null> {
    const r = await this.auth.localGet('/chat/v4/presences')
    if (r.status !== 200) throw new Error(`presences HTTP ${r.status}`)
    const presences: Array<Record<string, unknown>> = r.data?.presences ?? []
    for (const p of presences) {
      if (p.puuid === this.auth.puuid && p.product === 'valorant') {
        const priv = p.private as string | undefined
        if (!priv) return {}
        return JSON.parse(Buffer.from(priv, 'base64').toString('utf-8'))
      }
    }
    return null
  }

  async partyInviteCode(partyId: string): Promise<string | null> {
    try {
      const r = await this.remoteGet(`${this.glz}/parties/v1/parties/${partyId}`)
      if (r.status === 200 && r.data?.InviteCode) return String(r.data.InviteCode)
      const g = await this.remotePost(`${this.glz}/parties/v1/parties/${partyId}/invitecode`)
      if (g.status === 200 && g.data?.InviteCode) return String(g.data.InviteCode)
      console.debug('[api] invite code HTTP', g.status)
    } catch (e) {
      console.debug('[api] invite code error:', e)
    }
    return null
  }

  async partyInfo(partyId: string): Promise<PartyInfo | null> {
    try {
      const r = await this.remoteGet(`${this.glz}/parties/v1/parties/${partyId}`)
      if (r.status !== 200 || !r.data) return null
      return {
        state: String(r.data.State ?? ''),
        queueId: String(r.data.MatchmakingData?.QueueID ?? ''),
        members: ((r.data.Members ?? []) as Json[]).map((m) => String(m.Subject ?? ''))
      }
    } catch (e) {
      console.debug('[api] party error:', e)
      return null
    }
  }

  async joinByCode(code: string): Promise<boolean> {
    try {
      const r = await this.remotePost(
        `${this.glz}/parties/v1/players/joinbycode/${encodeURIComponent(code)}`
      )
      return r.status === 200
    } catch (e) {
      console.debug('[api] joinByCode error:', e)
      return false
    }
  }

  async requestJoin(partyId: string): Promise<boolean> {
    try {
      const r = await this.remotePost(`${this.glz}/parties/v1/parties/${partyId}/request`, {
        Subjects: [this.auth.puuid]
      })
      return r.status === 200
    } catch (e) {
      console.debug('[api] requestJoin error:', e)
      return false
    }
  }

  async matchPhase(): Promise<MatchPhase | null> {
    let core: CoreInfo | null = null
    try {
      core = await this.coregameInfo()
    } catch (e) {
      console.debug('[api] coregame error:', e)
    }
    if (core && !isRangeFlow(core.provisioning_flow)) return { phase: 'ingame', ...core }
    try {
      const info = await this.pregameInfo()
      if (info !== null) return { phase: 'pregame', ...info }
    } catch (e) {
      console.debug('[api] pregame error:', e)
    }
    return core ? { phase: 'ingame', ...core } : null
  }

  private async coregameInfo(): Promise<CoreInfo | null> {
    const r = await this.remoteGet(`${this.glz}/core-game/v1/players/${this.auth.puuid}`)
    if (r.status !== 200) return null
    const matchId = r.data?.MatchID
    if (!matchId) return null
    const rm = await this.remoteGet(`${this.glz}/core-game/v1/matches/${matchId}`)
    if (rm.status !== 200) return { agent: null, match_id: String(matchId) }
    const data = rm.data ?? {}
    const info: CoreInfo = {
      agent: null,
      match_id: String(matchId),
      provisioning_flow: String(data.ProvisioningFlow ?? ''),
      map: String(data.MapID ?? '')
    }
    for (const player of data.Players ?? []) {
      if (player.Subject === this.auth.puuid) {
        info.agent = player.CharacterID || null
        break
      }
    }
    return info
  }

  private async pregameInfo(): Promise<{
    agent: string | null
    match_id?: string
    queue_id?: string
    provisioning_flow?: string
  } | null> {
    const r = await this.remoteGet(`${this.glz}/pregame/v1/players/${this.auth.puuid}`)
    if (r.status !== 200) return null
    const matchId = r.data?.MatchID
    if (!matchId) return null
    const rm = await this.remoteGet(`${this.glz}/pregame/v1/matches/${matchId}`)
    if (rm.status !== 200) return { agent: null, match_id: matchId }
    const data = rm.data ?? {}
    let teams: Array<{ Players?: Array<Record<string, unknown>> }> = data.Teams ?? []
    if (data.AllyTeam) teams = [...teams, data.AllyTeam]
    let agentId: string | null = null
    for (const team of teams) {
      for (const player of team.Players ?? []) {
        if (player.Subject === this.auth.puuid) {
          agentId = (player.CharacterID as string) || null
          break
        }
      }
    }
    return {
      agent: agentId,
      match_id: matchId,
      queue_id: data.QueueID || '',
      provisioning_flow: data.ProvisioningFlowID || ''
    }
  }

  async mmr(): Promise<[number, number] | null> {
    try {
      const r = await this.remoteGet(`${this.pd}/mmr/v1/players/${this.auth.puuid}`)
      if (r.status !== 200) return null
      const data = r.data ?? {}

      const latest = data.LatestCompetitiveUpdate ?? {}
      const tier = latest.TierAfterUpdate
      const rr = latest.RankedRatingAfterUpdate
      if (tier) return [Number(tier), Number(rr || 0)]

      const seasonal = data?.QueueSkills?.competitive?.SeasonalInfoBySeasonID ?? {}
      let best: Record<string, number> | null = null
      for (const info of Object.values<Record<string, number>>(seasonal)) {
        if (info.CompetitiveTier) {
          if (best === null || (info.NumberOfGames || 0) >= (best.NumberOfGames || 0)) best = info
        }
      }
      if (best) return [Number(best.CompetitiveTier || 0), Number(best.RankedRating || 0)]
    } catch (e) {
      console.debug('[api] mmr error:', e)
    }
    return null
  }
}
