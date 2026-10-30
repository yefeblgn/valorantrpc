export type RoundEnd = 'elimination' | 'detonate' | 'defuse' | 'time' | 'surrender' | 'other'
export type MatchResult = 'win' | 'loss' | 'draw'
export type WL = [played: number, won: number]

export interface Point {
  x: number
  y: number
}

export interface HistoryPlayer {
  puuid: string
  name: string
  tag: string
  team: string
  party: string
  agent: string
  level: number
  tier: number
  score: number
  rounds: number
  kills: number
  deaths: number
  assists: number
  damage: number
  head: number
  body: number
  leg: number
  firstKills: number
  firstDeaths: number
  plants: number
  defuses: number
  casts: [c: number, q: number, e: number, x: number]
  multi: [k3: number, k4: number, k5: number]
}

export interface HistoryKill {
  t: number
  killer: number
  victim: number
  assists: number[]
  weapon: string
  kind: string
  victimAt: Point | null
  killerAt: Point | null
}

export interface RoundEcon {
  loadout: number
  spent: number
  remaining: number
  weapon: string
  armor: string
}

export interface RoundPlayer {
  damage: number
  head: number
  body: number
  leg: number
  score: number
  econ: RoundEcon | null
}

export interface HistoryRound {
  n: number
  winner: string
  attacker: string
  end: RoundEnd
  plant: { by: number; site: string; t: number; at: Point | null } | null
  defuse: { by: number; t: number; at: Point | null } | null
  kills: HistoryKill[]
  players: (RoundPlayer | null)[]
}

export interface MatchTeamResult {
  id: string
  won: boolean
  rounds: number
  points: number
}

export interface MatchDetail {
  version: 1
  id: string
  map: string
  queue: string
  mode: string
  start: number
  length: number
  season: string
  ranked: boolean
  custom: boolean
  completion: string
  teams: MatchTeamResult[]
  players: HistoryPlayer[]
  rounds: HistoryRound[]
}

export interface WeaponFact {
  kills: number
  deaths: number
  head: number
  body: number
  leg: number
  damage: number
  rounds: number
}

export interface SelfFacts {
  rounds: number
  attack: WL
  defense: WL
  pistol: WL
  eco: WL
  force: WL
  full: WL
  firstKill: WL
  firstDeath: WL
  weapons: Record<string, WeaponFact>
  clutches: WL[]
  plants: number
  defuses: number
  casts: [number, number, number, number]
}

export interface RrEntry {
  id: string
  start: number
  season: string
  map: string
  change: number
  before: number
  after: number
  tierBefore: number
  tier: number
}

export interface MatchSummary {
  id: string
  map: string
  queue: string
  mode: string
  start: number
  length: number
  season: string
  custom: boolean
  agent: string
  team: string
  result: MatchResult
  ally: number
  enemy: number
  kills: number
  deaths: number
  assists: number
  score: number
  rounds: number
  damage: number
  head: number
  body: number
  leg: number
  multi: [number, number, number]
  place: number
  players: number
  mvp: 'match' | 'team' | null
  partySize: number
  tier: number
  rr: RrEntry | null
  facts: SelfFacts | null
}

export interface HistoryAccount {
  puuid: string
  name: string
  tag: string
  lastSeen: number
}

export interface HistoryStatus {
  puuid: string
  accounts: HistoryAccount[]
  connected: boolean
  syncing: boolean
  total: number
  lastSync: number | null
  canBackfill: boolean
  error: string | null
}

export interface HistoryData {
  puuid: string
  matches: MatchSummary[]
  rr: RrEntry[]
}

export interface CatalogAgent {
  name: string
  icon: string | null
  portrait: string | null
  role: string
  abilities: [string, string, string, string]
}

export interface CatalogMap {
  name: string
  splash: string | null
  list: string | null
  minimap: string | null
  xMul: number
  yMul: number
  xAdd: number
  yAdd: number
}

export interface CatalogWeapon {
  name: string
  icon: string | null
  kill: string | null
  category: string
}

export interface CatalogSeason {
  label: string
  start: number
  end: number
  act: boolean
}

export interface Catalog {
  language: string
  agents: Record<string, CatalogAgent>
  maps: Record<string, CatalogMap>
  weapons: Record<string, CatalogWeapon>
  tiers: Record<number, { name: string; icon: string | null }>
  seasons: Record<string, CatalogSeason>
  modes: Record<string, { name: string; icon: string | null }>
  currentAct: string
}

export interface SessionSummary {
  matches: number
  wins: number
  losses: number
  draws: number
  rr: number
  rrKnown: boolean
  acs: number
  kd: number
  start: number
}

export const TEAM_QUEUES = ['competitive', 'unrated', 'swiftplay', 'premier', 'newmap']

const SESSION_GAP = 90 * 60 * 1000
const SESSION_IDLE = 3 * 3600 * 1000

export function acs(m: { score: number; rounds: number }): number {
  return m.rounds ? Math.round(m.score / m.rounds) : 0
}

export function ratio(a: number, b: number): number {
  return Math.round((a / Math.max(b, 1)) * 100) / 100
}

export function pct(part: number, total: number): number {
  return total ? Math.round((part / total) * 100) : 0
}

export function sessionOf(matches: MatchSummary[], now = Date.now()): SessionSummary | null {
  const sorted = [...matches].sort((a, b) => b.start - a.start)
  const latest = sorted[0]
  if (!latest || now - (latest.start + latest.length) > SESSION_IDLE) return null
  const list: MatchSummary[] = [latest]
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i]
    if (list[list.length - 1].start - (prev.start + prev.length) > SESSION_GAP) break
    list.push(prev)
  }
  const sum = list.reduce(
    (s, m) => ({
      wins: s.wins + Number(m.result === 'win'),
      losses: s.losses + Number(m.result === 'loss'),
      draws: s.draws + Number(m.result === 'draw'),
      rr: s.rr + (m.rr?.change ?? 0),
      rrKnown: s.rrKnown || !!m.rr,
      score: s.score + m.score,
      rounds: s.rounds + m.rounds,
      kills: s.kills + m.kills,
      deaths: s.deaths + m.deaths
    }),
    {
      wins: 0,
      losses: 0,
      draws: 0,
      rr: 0,
      rrKnown: false,
      score: 0,
      rounds: 0,
      kills: 0,
      deaths: 0
    }
  )
  return {
    matches: list.length,
    wins: sum.wins,
    losses: sum.losses,
    draws: sum.draws,
    rr: sum.rr,
    rrKnown: sum.rrKnown,
    acs: acs(sum),
    kd: ratio(sum.kills, sum.deaths),
    start: list[list.length - 1].start
  }
}

export function lossStreak(matches: MatchSummary[]): number {
  const sorted = [...matches].sort((a, b) => b.start - a.start)
  let streak = 0
  for (const m of sorted) {
    if (m.result !== 'loss') break
    streak++
  }
  return streak
}
