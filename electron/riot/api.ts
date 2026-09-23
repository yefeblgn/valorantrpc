import type { AxiosResponse } from 'axios'
import { riotClient } from '../lib/http'
import type { LocalAuth } from './localAuth'

export interface MatchPhase {
  phase: 'ingame' | 'pregame'
  agent: string | null
  match_id?: string
  queue_id?: string
  provisioning_flow?: string
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

  async selectAgent(matchId: string, agentUuid: string): Promise<boolean> {
    try {
      const r = await this.remotePost(`${this.glz}/pregame/v1/matches/${matchId}/select/${agentUuid}`)
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
    try {
      const info = await this.coregameInfo()
      if (info !== null) return { phase: 'ingame', ...info }
    } catch (e) {
      console.debug('[api] coregame error:', e)
    }
    try {
      const info = await this.pregameInfo()
      if (info !== null) return { phase: 'pregame', ...info }
    } catch (e) {
      console.debug('[api] pregame error:', e)
    }
    return null
  }

  private async coregameInfo(): Promise<{ agent: string | null } | null> {
    const r = await this.remoteGet(`${this.glz}/core-game/v1/players/${this.auth.puuid}`)
    if (r.status !== 200) return null
    const matchId = r.data?.MatchID
    if (!matchId) return null
    const rm = await this.remoteGet(`${this.glz}/core-game/v1/matches/${matchId}`)
    if (rm.status !== 200) return { agent: null }
    for (const player of rm.data?.Players ?? []) {
      if (player.Subject === this.auth.puuid) return { agent: player.CharacterID || null }
    }
    return { agent: null }
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
    if (rm.status !== 200) return { agent: null }
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
