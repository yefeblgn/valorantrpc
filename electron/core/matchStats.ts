import { EventEmitter } from 'events'
import type { MapStats, MatchPlayer, MatchReport, MatchTeam, PlayerStats } from '@shared/types'
import { t } from '@shared/i18n'
import type { PlayerName, RiotApi } from '../riot/api'
import type { Content } from '../riot/content'
import type { OwnHistory } from './ownHistory'

const ROSTER_REFRESH = { pregame: 4000, ingame: 30_000 }
const STATS_TTL = 15 * 60 * 1000
const ERROR_TTL = 60_000
const HISTORY_COUNT = 5
const DETAIL_SAMPLE = 3
const DETAIL_CACHE = 80
const STAT_WORKERS = 2
const ASCENDANT_START = Date.parse('2022-06-21T00:00:00Z')
const LEGACY_IMMORTAL = 21
const ASCENDANT_SHIFT = 3

type Json = Record<string, any>

export interface MatchTarget {
  phase: 'pregame' | 'ingame'
  matchId: string
}

export interface MatchContext {
  puuid: string
  partyId: string
}

interface RosterPlayer {
  puuid: string
  teamId: string
  agent: string
  locked: boolean
  incognito: boolean
  hideLevel: boolean
  level: number
}

interface Line {
  kills: number
  deaths: number
  assists: number
  head: number
  body: number
  leg: number
}

interface CachedStats {
  at: number
  stats: PlayerStats | null
}

function parseRoster(data: Json, phase: MatchTarget['phase']): RosterPlayer[] {
  const seen = new Set<string>()
  const out: RosterPlayer[] = []
  const add = (p: Json, teamId: unknown): void => {
    const puuid = String(p.Subject ?? '')
    if (!puuid || seen.has(puuid) || p.IsCoach) return
    seen.add(puuid)
    const identity: Json = p.PlayerIdentity ?? {}
    out.push({
      puuid,
      teamId: String(teamId ?? p.TeamID ?? ''),
      agent: String(p.CharacterID ?? ''),
      locked: phase === 'ingame' || p.CharacterSelectionState === 'locked',
      incognito: !!identity.Incognito,
      hideLevel: !!identity.HideAccountLevel,
      level: Number(identity.AccountLevel ?? 0)
    })
  }
  if (phase === 'pregame') {
    const teams: Json[] = [...(data.AllyTeam ? [data.AllyTeam] : []), ...(data.Teams ?? [])]
    for (const team of teams) for (const p of team.Players ?? []) add(p, team.TeamID)
  } else {
    for (const p of data.Players ?? []) add(p, p.TeamID)
  }
  return out
}

function summarize(data: Json): Map<string, Line> {
  const lines = new Map<string, Line>()
  for (const p of data.players ?? []) {
    const stats: Json = p.stats ?? {}
    lines.set(String(p.subject), {
      kills: Number(stats.kills ?? 0),
      deaths: Number(stats.deaths ?? 0),
      assists: Number(stats.assists ?? 0),
      head: 0,
      body: 0,
      leg: 0
    })
  }
  for (const round of data.roundResults ?? []) {
    for (const ps of round.playerStats ?? []) {
      const line = lines.get(String(ps.subject))
      if (!line) continue
      for (const hit of ps.damage ?? []) {
        line.head += Number(hit.headshots ?? 0)
        line.body += Number(hit.bodyshots ?? 0)
        line.leg += Number(hit.legshots ?? 0)
      }
    }
  }
  return lines
}

function ratio(value: number, by: number): number {
  return Math.round((value / Math.max(by, 1)) * 100) / 100
}

function seasonEntry(seasonal: Record<string, Json>, id: string): Json | null {
  if (!id) return null
  for (const [key, value] of Object.entries(seasonal)) {
    if (key.toLowerCase() === id) return value
  }
  return null
}

export class MatchStats extends EventEmitter {
  private report: MatchReport | null = null
  private target: MatchTarget | null = null
  private roster: RosterPlayer[] = []
  private rosterAt = 0
  private rosterBusy = false
  private statsBusy = false
  private self = ''
  private meta = { mapPath: '', queueId: '', custom: false }
  private readonly party = new Set<string>()
  private readonly names = new Map<string, PlayerName>()
  private readonly stats = new Map<string, CachedStats>()
  private readonly details = new Map<string, Map<string, Line>>()

  constructor(
    private readonly content: Content,
    private readonly history: OwnHistory
  ) {
    super()
    history.on('updated', () => this.publish())
  }

  getReport(): MatchReport | null {
    return this.report
  }

  clear(): void {
    if (!this.target && !this.report) return
    this.target = null
    this.roster = []
    this.rosterAt = 0
    this.party.clear()
    this.report = null
    this.emit('report', null)
  }

  sync(api: RiotApi, target: MatchTarget | null, ctx: MatchContext): void {
    if (!target) return this.clear()
    const sameMatch = this.target?.matchId === target.matchId
    if (!sameMatch) {
      this.roster = []
      this.party.clear()
      this.report = null
    }
    if (!sameMatch || this.target?.phase !== target.phase) {
      this.target = target
      this.rosterAt = 0
    }
    this.self = ctx.puuid
    const due = Date.now() - this.rosterAt >= ROSTER_REFRESH[target.phase]
    if (due && !this.rosterBusy) void this.refreshRoster(api, target, ctx)
  }

  private isCurrent(target: MatchTarget): boolean {
    return this.target?.matchId === target.matchId && this.target.phase === target.phase
  }

  private fresh(puuid: string): boolean {
    const cached = this.stats.get(puuid)
    if (!cached) return false
    return Date.now() - cached.at < (cached.stats ? STATS_TTL : ERROR_TTL)
  }

  private async refreshRoster(api: RiotApi, target: MatchTarget, ctx: MatchContext): Promise<void> {
    this.rosterBusy = true
    try {
      if (!this.party.size && ctx.partyId) {
        const info = await api.partyInfo(ctx.partyId)
        for (const member of info?.members ?? []) if (member) this.party.add(member)
      }
      const data = await api.matchRoster(target.phase, target.matchId)
      if (!this.isCurrent(target)) return
      this.rosterAt = Date.now()
      if (!data) return
      const roster = parseRoster(data, target.phase)
      if (!roster.length) return
      this.roster = roster
      this.meta = {
        mapPath: String(data.MapID ?? ''),
        queueId: String(data.QueueID ?? data.MatchmakingData?.QueueID ?? ''),
        custom: /custom/i.test(String(data.ProvisioningFlowID ?? data.ProvisioningFlow ?? ''))
      }
      await this.resolveNames(api)
      if (!this.isCurrent(target)) return
      this.publish()
      if (!this.statsBusy) void this.fillStats(api, target.matchId)
    } catch (e) {
      console.debug('[match] roster error:', e)
    } finally {
      this.rosterBusy = false
    }
  }

  private hidden(p: RosterPlayer): boolean {
    return p.incognito && p.puuid !== this.self && !this.party.has(p.puuid)
  }

  private async resolveNames(api: RiotApi): Promise<void> {
    const missing = this.roster
      .filter((p) => !this.hidden(p) && !this.names.has(p.puuid))
      .map((p) => p.puuid)
    for (const entry of await api.playerNames(missing)) {
      if (entry.puuid) this.names.set(entry.puuid, entry)
    }
  }

  private async fillStats(api: RiotApi, matchId: string): Promise<void> {
    this.statsBusy = true
    try {
      await this.content.ensureSeasons()
      const pending = this.roster.map((p) => p.puuid).filter((id) => !this.fresh(id))
      let next = 0
      const worker = async (): Promise<void> => {
        while (next < pending.length && this.target?.matchId === matchId) {
          const puuid = pending[next++]
          const stats = await this.loadStats(api, puuid).catch((e) => {
            console.debug('[match] stats error:', e)
            return null
          })
          this.stats.set(puuid, { at: Date.now(), stats })
          if (this.target?.matchId === matchId) this.publish()
        }
      }
      await Promise.all(Array.from({ length: STAT_WORKERS }, worker))
    } finally {
      this.statsBusy = false
    }
    const current = this.target?.matchId
    if (current && this.roster.some((p) => !this.fresh(p.puuid))) void this.fillStats(api, current)
  }

  private async loadStats(api: RiotApi, puuid: string): Promise<PlayerStats | null> {
    const mmr = await api.playerMmr(puuid)
    if (!mmr) return null
    const seasonal: Record<string, Json> =
      mmr.QueueSkills?.competitive?.SeasonalInfoBySeasonID ?? {}
    const act = this.content.currentAct()
    const current = seasonEntry(seasonal, act)

    let rankTier = Number(current?.CompetitiveTier ?? 0)
    let rr: number | null = current ? Number(current.RankedRating ?? 0) : null
    const latest: Json = mmr.LatestCompetitiveUpdate ?? {}
    if (act && String(latest.SeasonID ?? '').toLowerCase() === act && latest.TierAfterUpdate) {
      rankTier = Number(latest.TierAfterUpdate)
      rr = Number(latest.RankedRatingAfterUpdate ?? rr ?? 0)
    }
    if (!rankTier) rr = null

    let peakTier = 0
    let peakSeason = ''
    for (const [season, info] of Object.entries(seasonal)) {
      const start = this.content.seasonStart(season)
      const legacy = start > 0 && start < ASCENDANT_START
      for (const raw of Object.keys(info?.WinsByTier ?? {}).map(Number)) {
        const tier = legacy && raw >= LEGACY_IMMORTAL ? raw + ASCENDANT_SHIFT : raw
        if (tier > peakTier) {
          peakTier = tier
          peakSeason = season
        }
      }
    }
    if (rankTier > peakTier) {
      peakTier = rankTier
      peakSeason = act
    }

    const lines = await this.recentLines(api, puuid)
    const total = lines.reduce(
      (sum, l) => ({
        kills: sum.kills + l.kills,
        deaths: sum.deaths + l.deaths,
        assists: sum.assists + l.assists,
        head: sum.head + l.head,
        shots: sum.shots + l.head + l.body + l.leg
      }),
      { kills: 0, deaths: 0, assists: 0, head: 0, shots: 0 }
    )

    return {
      rankTier,
      rankName: this.content.tierName(rankTier),
      rankIcon: this.content.tierIcon(rankTier),
      rr,
      peakTier,
      peakName: this.content.tierName(peakTier),
      peakIcon: peakTier ? this.content.tierIcon(peakTier) : null,
      peakAct: peakSeason ? this.content.actLabel(peakSeason) : '',
      wins: Number(current?.NumberOfWinsWithPlacements ?? current?.NumberOfWins ?? 0),
      games: Number(current?.NumberOfGames ?? 0),
      kd: lines.length ? ratio(total.kills, total.deaths) : null,
      kda: lines.length ? ratio(total.kills + total.assists, total.deaths) : null,
      hs: total.shots ? Math.round((total.head / total.shots) * 100) : null,
      sample: lines.length
    }
  }

  private async recentLines(api: RiotApi, puuid: string): Promise<Line[]> {
    const ids = await api.matchHistory(puuid, HISTORY_COUNT)
    const lines: Line[] = []
    for (const id of (ids ?? []).slice(0, DETAIL_SAMPLE)) {
      let summary = this.details.get(id)
      if (!summary) {
        const data = await api.matchDetails(id)
        if (!data) continue
        summary = summarize(data)
        this.details.set(id, summary)
        if (this.details.size > DETAIL_CACHE) {
          const oldest = this.details.keys().next().value
          if (oldest) this.details.delete(oldest)
        }
      }
      const line = summary.get(puuid)
      if (line) lines.push(line)
    }
    return lines
  }

  private average(players: MatchPlayer[]): MatchTeam['avgRank'] {
    const tiers = players.map((p) => p.stats?.rankTier ?? 0).filter((tier) => tier > 0)
    if (!tiers.length) return null
    const tier = Math.round(tiers.reduce((sum, v) => sum + v, 0) / tiers.length)
    return { name: this.content.tierName(tier), icon: this.content.tierIcon(tier) }
  }

  private mapStats(): MapStats | null {
    if (!this.meta.mapPath || !this.history.hasPlayer()) return null
    const record = this.history.forMap(this.meta.mapPath)
    return {
      state: this.history.isReady() ? 'ready' : 'syncing',
      sample: record.sample,
      agents: record.agents.map((a) => ({
        uuid: a.agent,
        name: this.content.agentName(a.agent),
        icon: this.content.agentIcon(a.agent),
        games: a.games,
        wins: a.wins
      }))
    }
  }

  private publish(): void {
    const target = this.target
    if (!target || !this.roster.length) return
    const allyId = this.roster.find((p) => p.puuid === this.self)?.teamId ?? ''
    const byTeam = new Map<string, MatchPlayer[]>()
    for (const p of this.roster) {
      const isSelf = p.puuid === this.self
      const hidden = this.hidden(p)
      const name = hidden ? undefined : this.names.get(p.puuid)
      const cached = this.stats.get(p.puuid)
      const player: MatchPlayer = {
        puuid: p.puuid,
        name: name?.name ?? '',
        tag: name?.tag ?? '',
        hidden,
        isSelf,
        inParty: !isSelf && this.party.has(p.puuid),
        agentName: this.content.agentName(p.agent),
        agentIcon: this.content.agentIcon(p.agent),
        locked: p.locked,
        level: (p.hideLevel && !isSelf) || !p.level ? null : p.level,
        stats: cached?.stats ?? null,
        statsState: cached ? (cached.stats ? 'ready' : 'error') : 'loading'
      }
      const list = byTeam.get(p.teamId) ?? []
      list.push(player)
      byTeam.set(p.teamId, list)
    }

    let teams: MatchTeam[] = [...byTeam.entries()]
      .map(([id, players]) => ({
        id,
        ally: id === allyId,
        players,
        avgRank: this.average(players)
      }))
      .sort((a, b) => Number(b.ally) - Number(a.ally))
    if (teams.length > 2) {
      const players = teams.flatMap((team) => team.players)
      players.sort((a, b) => Number(b.isSelf) - Number(a.isSelf))
      teams = [{ id: 'all', ally: false, players, avgRank: this.average(players) }]
    }

    const [mapName, mapSplash] = this.content.mapInfo(this.meta.mapPath)
    this.report = {
      matchId: target.matchId,
      phase: target.phase,
      mapName,
      mapSplash,
      mapIcon: this.content.mapIcon(this.meta.mapPath),
      modeName: this.meta.custom
        ? t(this.content.language, 'custom')
        : this.content.modeName(this.meta.queueId),
      modeIcon: this.content.modeIcon(this.meta.custom ? 'custom' : this.meta.queueId),
      teams,
      mapStats: this.mapStats()
    }
    this.emit('report', this.report)
  }
}
