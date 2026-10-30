import type { MatchSummary, RrEntry, WL, WeaponFact } from '@shared/history'
import { acs, pct, ratio } from '@shared/history'

export interface CareerFilter {
  queue: string
  season: string
  map: string
  agent: string
}

export const ALL = 'all'
export const DEFAULT_FILTER: CareerFilter = { queue: ALL, season: ALL, map: ALL, agent: ALL }

export function filterMatches(matches: MatchSummary[], f: CareerFilter): MatchSummary[] {
  return matches.filter(
    (m) =>
      (f.queue === ALL || (f.queue === 'custom' ? m.custom : !m.custom && m.queue === f.queue)) &&
      (f.season === ALL || m.season === f.season) &&
      (f.map === ALL || m.map === f.map) &&
      (f.agent === ALL || m.agent === f.agent)
  )
}

export interface Totals {
  matches: number
  wins: number
  losses: number
  draws: number
  kills: number
  deaths: number
  assists: number
  score: number
  rounds: number
  damage: number
  head: number
  body: number
  leg: number
  firstKills: number
  firstDeaths: number
  playtime: number
}

export function emptyTotals(): Totals {
  return {
    matches: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    kills: 0,
    deaths: 0,
    assists: 0,
    score: 0,
    rounds: 0,
    damage: 0,
    head: 0,
    body: 0,
    leg: 0,
    firstKills: 0,
    firstDeaths: 0,
    playtime: 0
  }
}

export function addTotals(t: Totals, m: MatchSummary): Totals {
  t.matches++
  if (m.result === 'win') t.wins++
  else if (m.result === 'loss') t.losses++
  else t.draws++
  t.kills += m.kills
  t.deaths += m.deaths
  t.assists += m.assists
  t.score += m.score
  t.rounds += m.rounds
  t.damage += m.damage
  t.head += m.head
  t.body += m.body
  t.leg += m.leg
  t.firstKills += m.facts?.firstKill[0] ?? 0
  t.firstDeaths += m.facts?.firstDeath[0] ?? 0
  t.playtime += m.length
  return t
}

export function totalsOf(matches: MatchSummary[]): Totals {
  return matches.reduce(addTotals, emptyTotals())
}

export interface Derived {
  winRate: number
  kd: number
  kda: number
  acs: number
  adr: number
  hs: number
}

export function derive(t: Totals): Derived {
  return {
    winRate: pct(t.wins, t.matches),
    kd: ratio(t.kills, t.deaths),
    kda: ratio(t.kills + t.assists, t.deaths),
    acs: acs(t),
    adr: t.rounds ? Math.round(t.damage / t.rounds) : 0,
    hs: pct(t.head, t.head + t.body + t.leg)
  }
}

export interface AgentRow {
  agent: string
  totals: Totals
  derived: Derived
  casts: [number, number, number, number]
  maps: { map: string; matches: number; wins: number }[]
  last: number
}

export function agentRows(matches: MatchSummary[]): AgentRow[] {
  const by = new Map<string, MatchSummary[]>()
  for (const m of matches) {
    const list = by.get(m.agent) ?? []
    list.push(m)
    by.set(m.agent, list)
  }
  return [...by.entries()]
    .map(([agent, list]) => {
      const totals = totalsOf(list)
      const casts = list.reduce<[number, number, number, number]>(
        (sum, m) => {
          const c = m.facts?.casts ?? [0, 0, 0, 0]
          return [sum[0] + c[0], sum[1] + c[1], sum[2] + c[2], sum[3] + c[3]]
        },
        [0, 0, 0, 0]
      )
      const maps = new Map<string, { map: string; matches: number; wins: number }>()
      for (const m of list) {
        const row = maps.get(m.map) ?? { map: m.map, matches: 0, wins: 0 }
        row.matches++
        if (m.result === 'win') row.wins++
        maps.set(m.map, row)
      }
      return {
        agent,
        totals,
        derived: derive(totals),
        casts,
        maps: [...maps.values()].sort((a, b) => b.matches - a.matches),
        last: Math.max(...list.map((m) => m.start))
      }
    })
    .sort((a, b) => b.totals.matches - a.totals.matches || b.derived.winRate - a.derived.winRate)
}

export interface WeaponRow extends WeaponFact {
  weapon: string
  hs: number
  kpr: number
}

export function weaponRows(matches: MatchSummary[]): WeaponRow[] {
  const by = new Map<string, WeaponFact>()
  for (const m of matches) {
    for (const [weapon, f] of Object.entries(m.facts?.weapons ?? {})) {
      const row = by.get(weapon) ?? {
        kills: 0,
        deaths: 0,
        head: 0,
        body: 0,
        leg: 0,
        damage: 0,
        rounds: 0
      }
      row.kills += f.kills
      row.deaths += f.deaths
      row.head += f.head
      row.body += f.body
      row.leg += f.leg
      row.damage += f.damage
      row.rounds += f.rounds
      by.set(weapon, row)
    }
  }
  return [...by.entries()]
    .map(([weapon, f]) => ({
      weapon,
      ...f,
      hs: pct(f.head, f.head + f.body + f.leg),
      kpr: f.rounds ? Math.round((f.kills / f.rounds) * 100) / 100 : 0
    }))
    .filter((w) => w.kills > 0 || w.rounds > 0 || w.deaths > 0)
    .sort((a, b) => b.kills - a.kills || b.rounds - a.rounds)
}

function sumWl(a: WL, b: WL): WL {
  return [a[0] + b[0], a[1] + b[1]]
}

export interface Analysis {
  rounds: number
  attack: WL
  defense: WL
  pistol: WL
  eco: WL
  force: WL
  full: WL
  firstKill: WL
  firstDeath: WL
  clutches: WL[]
  plants: number
  defuses: number
}

export function analysisOf(matches: MatchSummary[]): Analysis {
  const zero = (): WL => [0, 0]
  const a: Analysis = {
    rounds: 0,
    attack: zero(),
    defense: zero(),
    pistol: zero(),
    eco: zero(),
    force: zero(),
    full: zero(),
    firstKill: zero(),
    firstDeath: zero(),
    clutches: Array.from({ length: 5 }, zero),
    plants: 0,
    defuses: 0
  }
  for (const m of matches) {
    const f = m.facts
    if (!f) continue
    a.rounds += f.rounds
    a.attack = sumWl(a.attack, f.attack)
    a.defense = sumWl(a.defense, f.defense)
    a.pistol = sumWl(a.pistol, f.pistol)
    a.eco = sumWl(a.eco, f.eco)
    a.force = sumWl(a.force, f.force)
    a.full = sumWl(a.full, f.full)
    a.firstKill = sumWl(a.firstKill, f.firstKill)
    a.firstDeath = sumWl(a.firstDeath, f.firstDeath)
    a.clutches = a.clutches.map((c, i) => sumWl(c, f.clutches[i] ?? [0, 0]))
    a.plants += f.plants
    a.defuses += f.defuses
  }
  return a
}

export interface FirstBloodRow {
  key: string
  rounds: number
  firstKill: WL
  firstDeath: WL
}

export function firstBloodBy(
  matches: MatchSummary[],
  key: (m: MatchSummary) => string
): FirstBloodRow[] {
  const by = new Map<string, FirstBloodRow>()
  for (const m of matches) {
    if (!m.facts) continue
    const k = key(m)
    const row = by.get(k) ?? { key: k, rounds: 0, firstKill: [0, 0], firstDeath: [0, 0] }
    row.rounds += m.facts.rounds
    row.firstKill = sumWl(row.firstKill, m.facts.firstKill)
    row.firstDeath = sumWl(row.firstDeath, m.facts.firstDeath)
    by.set(k, row)
  }
  return [...by.values()].sort((a, b) => b.rounds - a.rounds)
}

export interface RecordEntry {
  key: string
  value: number
  display: string
  match: MatchSummary | null
  extra?: number
}

const MIN_ROUNDS_FOR_RATE = 10

export function recordsOf(matches: MatchSummary[], locale: string): RecordEntry[] {
  const best = (
    key: string,
    value: (m: MatchSummary) => number,
    display: (v: number) => string,
    eligible: (m: MatchSummary) => boolean = () => true
  ): RecordEntry => {
    let top: MatchSummary | null = null
    let topValue = -Infinity
    for (const m of matches) {
      if (!eligible(m)) continue
      const v = value(m)
      if (v > topValue) {
        topValue = v
        top = m
      }
    }
    return { key, value: top ? topValue : 0, display: top ? display(topValue) : '—', match: top }
  }

  const roundBased = (m: MatchSummary): boolean => !!m.facts && m.rounds >= MIN_ROUNDS_FOR_RATE
  const records: RecordEntry[] = [
    best('rec_acs', (m) => acs(m), String, roundBased),
    best('rec_kills', (m) => m.kills, String),
    best('rec_adr', (m) => (m.rounds ? Math.round(m.damage / m.rounds) : 0), String, roundBased),
    best(
      'rec_hs',
      (m) => pct(m.head, m.head + m.body + m.leg),
      (v) => `${v}%`,
      roundBased
    ),
    best(
      'rec_kd',
      (m) => ratio(m.kills, m.deaths),
      (v) => v.toFixed(2),
      roundBased
    ),
    best(
      'rec_aces',
      (m) => m.multi[2],
      String,
      (m) => m.multi[2] > 0
    ),
    best(
      'rec_clutch',
      (m) => {
        const c = m.facts?.clutches ?? []
        for (let i = c.length - 1; i >= 0; i--) if (c[i][1] > 0) return i + 1
        return 0
      },
      (v) => `1v${v}`,
      (m) => !!m.facts?.clutches.some((c) => c[1] > 0)
    ),
    best(
      'rec_longest',
      (m) => m.length,
      (v) => formatDuration(v, locale)
    )
  ]

  const sorted = [...matches].sort((a, b) => a.start - b.start)
  let run = 0
  let bestRun = 0
  let bestEnd: MatchSummary | null = null
  for (const m of sorted) {
    if (m.result === 'win') {
      run++
      if (run > bestRun) {
        bestRun = run
        bestEnd = m
      }
    } else {
      run = 0
    }
  }
  records.push({
    key: 'rec_streak',
    value: bestRun,
    display: bestRun ? String(bestRun) : '—',
    match: bestEnd
  })
  return records
}

export interface RrPoint {
  entry: RrEntry
  total: number
}

const TIER_RR = 100
const FIRST_TIER = 3
export const IMMORTAL_TIER = 24

export function absoluteRr(tier: number, rr: number): number {
  return Math.max(Math.min(tier, IMMORTAL_TIER) - FIRST_TIER, 0) * TIER_RR + rr
}

export function rrTimeline(entries: RrEntry[], season: string): RrPoint[] {
  return entries
    .filter((e) => (season === ALL || e.season === season) && e.tier > 0)
    .sort((a, b) => a.start - b.start)
    .map((entry) => ({ entry, total: absoluteRr(entry.tier, entry.after) }))
}

export interface GoalProgress {
  needed: number
  avgGain: number
  avgLoss: number
  winRate: number
  estimate: number | null
}

export function goalProgress(
  current: { tier: number; rr: number },
  goal: number,
  entries: RrEntry[]
): GoalProgress | null {
  if (!goal || !current.tier || goal <= current.tier) return null
  const needed = absoluteRr(goal, 0) - absoluteRr(current.tier, current.rr)
  const recent = [...entries].sort((a, b) => b.start - a.start).slice(0, 40)
  const gains = recent.filter((e) => e.change > 0).map((e) => e.change)
  const losses = recent.filter((e) => e.change < 0).map((e) => -e.change)
  const avg = (list: number[]): number =>
    list.length ? Math.round(list.reduce((s, v) => s + v, 0) / list.length) : 0
  const avgGain = avg(gains)
  const avgLoss = avg(losses)
  const decided = gains.length + losses.length
  const winRate = decided ? gains.length / decided : 0
  const perMatch = winRate * avgGain - (1 - winRate) * avgLoss
  return {
    needed,
    avgGain,
    avgLoss,
    winRate: Math.round(winRate * 100),
    estimate: perMatch > 0 ? Math.ceil(needed / perMatch) : null
  }
}

export function formatDuration(ms: number, locale: string): string {
  const total = Math.round(ms / 60000)
  const unit = (value: number, u: 'hour' | 'minute'): string =>
    new Intl.NumberFormat(locale, { style: 'unit', unit: u, unitDisplay: 'narrow' }).format(value)
  const h = Math.floor(total / 60)
  return h ? `${unit(h, 'hour')} ${unit(total % 60, 'minute')}` : unit(total, 'minute')
}

export function wlRate(v: WL): number {
  return pct(v[1], v[0])
}
