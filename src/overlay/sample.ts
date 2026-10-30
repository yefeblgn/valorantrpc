import type { Catalog } from '@shared/history'
import type { MatchPlayer, MatchReport, PlayerStats } from '@shared/types'

const NAMES = ['you', 'Duo', 'Sentinel', 'Entry', 'Smokes']
const SAMPLE = [
  { tier: 15, rr: 47, wins: 24, games: 42, kd: 1.31 },
  { tier: 18, rr: 10, wins: 5, games: 12, kd: 0.84 },
  { tier: 17, rr: 63, wins: 31, games: 55, kd: 1.05 },
  { tier: 14, rr: 88, wins: 12, games: 20, kd: 1.12 },
  { tier: 16, rr: 21, wins: 18, games: 37, kd: 0.97 }
]

export function sampleReport(
  catalog: Catalog | null,
  labels: { you: string; mapName: string; modeName: string }
): MatchReport {
  const agents = Object.keys(catalog?.agents ?? {}).slice(0, 8)
  const tier = (n: number): { name: string; icon: string | null } =>
    catalog?.tiers[n] ?? { name: `Tier ${n}`, icon: null }
  const map = Object.values(catalog?.maps ?? {}).find((m) => m.list && m.minimap)

  const players: MatchPlayer[] = SAMPLE.map((s, i) => {
    const agent = agents[i] ?? ''
    const stats: PlayerStats = {
      rankTier: s.tier,
      rankName: tier(s.tier).name,
      rankIcon: tier(s.tier).icon,
      rr: s.rr,
      peakTier: s.tier + 2,
      peakName: tier(s.tier + 2).name,
      peakIcon: tier(s.tier + 2).icon,
      peakAct: '',
      wins: s.wins,
      games: s.games,
      kd: s.kd,
      kda: Math.round((s.kd + 0.5) * 100) / 100,
      hs: 22,
      sample: 3
    }
    return {
      puuid: `sample-${i}`,
      name: i === 0 ? labels.you : NAMES[i],
      tag: 'TR1',
      hidden: false,
      isSelf: i === 0,
      inParty: i === 1,
      agentName: catalog?.agents[agent]?.name ?? '',
      agentIcon: catalog?.agents[agent]?.icon ?? null,
      locked: i !== 3,
      level: 120 + i * 17,
      stats,
      statsState: 'ready'
    }
  })

  return {
    matchId: 'sample',
    phase: 'pregame',
    mapName: map?.name || labels.mapName,
    mapSplash: map?.splash ?? null,
    mapIcon: map?.list ?? null,
    modeName: labels.modeName,
    modeIcon: catalog?.modes.competitive?.icon ?? null,
    teams: [
      { id: 'Blue', ally: true, players, avgRank: { name: tier(16).name, icon: tier(16).icon } }
    ],
    mapStats: {
      state: 'ready',
      sample: 47,
      agents: [5, 6, 7].map((i, n) => ({
        uuid: agents[i] ?? `sample-agent-${n}`,
        name: catalog?.agents[agents[i] ?? '']?.name ?? '',
        icon: catalog?.agents[agents[i] ?? '']?.icon ?? null,
        games: [12, 8, 4][n],
        wins: [8, 4, 1][n]
      }))
    }
  }
}
