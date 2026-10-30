import type {
  HistoryKill,
  HistoryPlayer,
  HistoryRound,
  MatchDetail,
  MatchSummary,
  Point,
  RoundEnd,
  RoundPlayer,
  SelfFacts,
  WL,
  WeaponFact
} from '@shared/history'

type Json = Record<string, any>

const HALF: Record<string, number> = { swiftplay: 4, spikerush: 3 }
const ECO_MAX = 2000
const FULL_MIN = 3900
const MAX_CLUTCH = 5
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

function point(v: Json | null | undefined): Point | null {
  if (!v) return null
  const x = Number(v.x)
  const y = Number(v.y)
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null
}

function roundEnd(code: unknown, result: unknown): RoundEnd {
  const s = `${code ?? ''} ${result ?? ''}`.toLowerCase()
  if (s.includes('defus')) return 'defuse'
  if (s.includes('detonat')) return 'detonate'
  if (s.includes('elimin')) return 'elimination'
  if (s.includes('surrender')) return 'surrender'
  if (s.includes('time') || s.includes('expire')) return 'time'
  return 'other'
}

function wl(): WL {
  return [0, 0]
}

function add(target: WL, won: boolean): void {
  target[0]++
  if (won) target[1]++
}

function emptyFacts(): SelfFacts {
  return {
    rounds: 0,
    attack: wl(),
    defense: wl(),
    pistol: wl(),
    eco: wl(),
    force: wl(),
    full: wl(),
    firstKill: wl(),
    firstDeath: wl(),
    weapons: {},
    clutches: Array.from({ length: MAX_CLUTCH }, wl),
    plants: 0,
    defuses: 0,
    casts: [0, 0, 0, 0]
  }
}

function weaponFact(facts: SelfFacts, weapon: string): WeaponFact {
  const existing = facts.weapons[weapon]
  if (existing) return existing
  const created = { kills: 0, deaths: 0, head: 0, body: 0, leg: 0, damage: 0, rounds: 0 }
  facts.weapons[weapon] = created
  return created
}

function collectKills(data: Json): Map<number, Json[]> {
  const byRound = new Map<number, Json[]>()
  const push = (round: number, kill: Json): void => {
    const list = byRound.get(round) ?? []
    list.push(kill)
    byRound.set(round, list)
  }
  if (Array.isArray(data.kills) && data.kills.length) {
    for (const k of data.kills as Json[]) push(Number(k.round ?? 0), k)
  } else {
    for (const r of (data.roundResults ?? []) as Json[]) {
      for (const ps of (r.playerStats ?? []) as Json[]) {
        for (const k of (ps.kills ?? []) as Json[]) push(Number(r.roundNum ?? 0), k)
      }
    }
  }
  for (const list of byRound.values()) {
    list.sort((a, b) => Number(a.roundTime ?? 0) - Number(b.roundTime ?? 0))
  }
  return byRound
}

export function parseMatch(data: Json): MatchDetail | null {
  const info: Json = data.matchInfo ?? {}
  if (info.isCompleted === false) return null
  const id = String(info.matchId ?? '')
  if (!id) return null

  const queue = String(info.queueID ?? '').toLowerCase()
  const custom = /custom/i.test(String(info.provisioningFlowID ?? ''))
  const raw = ((data.players ?? []) as Json[]).filter((p) => p.subject && !p.isObserver)
  const index = new Map<string, number>()
  raw.forEach((p, i) => index.set(String(p.subject), i))
  const at = (puuid: unknown): number => index.get(String(puuid ?? '')) ?? -1

  const players: HistoryPlayer[] = raw.map((p) => {
    const st: Json = p.stats ?? {}
    const casts: Json = st.abilityCasts ?? {}
    return {
      puuid: String(p.subject),
      name: String(p.gameName ?? ''),
      tag: String(p.tagLine ?? ''),
      team: String(p.teamId ?? ''),
      party: String(p.partyId ?? ''),
      agent: String(p.characterId ?? '').toLowerCase(),
      level: Number(p.accountLevel ?? 0),
      tier: Number(p.competitiveTier ?? 0),
      score: Number(st.score ?? 0),
      rounds: Number(st.roundsPlayed ?? 0),
      kills: Number(st.kills ?? 0),
      deaths: Number(st.deaths ?? 0),
      assists: Number(st.assists ?? 0),
      damage: 0,
      head: 0,
      body: 0,
      leg: 0,
      firstKills: 0,
      firstDeaths: 0,
      plants: 0,
      defuses: 0,
      casts: [
        Number(casts.grenadeCasts ?? 0),
        Number(casts.ability1Casts ?? 0),
        Number(casts.ability2Casts ?? 0),
        Number(casts.ultimateCasts ?? 0)
      ],
      multi: [0, 0, 0]
    }
  })

  const teams = ((data.teams ?? []) as Json[]).map((tm) => ({
    id: String(tm.teamId ?? ''),
    won: tm.won === true,
    rounds: Number(tm.roundsWon ?? 0),
    points: Number(tm.numPoints ?? 0)
  }))
  const teamIds = teams.map((tm) => tm.id)
  const other = (team: string): string => teamIds.find((tm) => tm !== team) ?? ''
  const killsByRound = collectKills(data)
  const half = HALF[queue] ?? 12

  const rounds: HistoryRound[] = ((data.roundResults ?? []) as Json[]).map((r) => {
    const n = Number(r.roundNum ?? 0)
    const roundPlayers: (RoundPlayer | null)[] = players.map(() => null)
    for (const ps of (r.playerStats ?? []) as Json[]) {
      const i = at(ps.subject)
      if (i < 0) continue
      const me = players[i]
      const row: RoundPlayer = {
        damage: 0,
        head: 0,
        body: 0,
        leg: 0,
        score: Number(ps.score ?? 0),
        econ: null
      }
      for (const d of (ps.damage ?? []) as Json[]) {
        const receiver = at(d.receiver)
        if (receiver >= 0 && players[receiver].team === me.team) continue
        row.damage += Number(d.damage ?? 0)
        row.head += Number(d.headshots ?? 0)
        row.body += Number(d.bodyshots ?? 0)
        row.leg += Number(d.legshots ?? 0)
      }
      const econ: Json | undefined =
        ps.economy ?? ((r.playerEconomies ?? []) as Json[]).find((e) => e.subject === ps.subject)
      if (econ) {
        row.econ = {
          loadout: Number(econ.loadoutValue ?? 0),
          spent: Number(econ.spent ?? 0),
          remaining: Number(econ.remaining ?? 0),
          weapon: String(econ.weapon ?? '').toLowerCase(),
          armor: String(econ.armor ?? '').toLowerCase()
        }
      }
      me.damage += row.damage
      me.head += row.head
      me.body += row.body
      me.leg += row.leg
      roundPlayers[i] = row
    }

    const kills: HistoryKill[] = (killsByRound.get(n) ?? []).map((k) => {
      const killer = at(k.killer)
      const finishing: Json = k.finishingDamage ?? {}
      const located = ((k.playerLocations ?? []) as Json[]).find((l) => l.subject === k.killer)
      return {
        t: Number(k.roundTime ?? 0),
        killer,
        victim: at(k.victim),
        assists: ((k.assistants ?? []) as unknown[]).map(at).filter((i) => i >= 0),
        weapon: String(finishing.damageItem ?? '').toLowerCase(),
        kind: String(finishing.damageType ?? '').toLowerCase(),
        victimAt: point(k.victimLocation),
        killerAt: point(located?.location)
      }
    })

    const planter = at(r.bombPlanter)
    const defuser = at(r.bombDefuser)
    return {
      n,
      winner: String(r.winningTeam ?? ''),
      attacker: '',
      end: roundEnd(r.roundResultCode, r.roundResult),
      plant:
        planter >= 0
          ? {
              by: planter,
              site: String(r.plantSite ?? ''),
              t: Number(r.plantRoundTime ?? 0),
              at: point(r.plantLocation)
            }
          : null,
      defuse:
        defuser >= 0
          ? { by: defuser, t: Number(r.defuseRoundTime ?? 0), at: point(r.defuseLocation) }
          : null,
      kills,
      players: roundPlayers
    }
  })

  if (teamIds.length === 2 && rounds.length) {
    let first = teamIds.includes('Red') ? 'Red' : teamIds[0]
    const firstHalfPlant = rounds.find((r) => r.n < half && r.plant)
    const secondHalfPlant = rounds.find((r) => r.n >= half && r.n < half * 2 && r.plant)
    if (firstHalfPlant?.plant) first = players[firstHalfPlant.plant.by].team
    else if (secondHalfPlant?.plant) first = other(players[secondHalfPlant.plant.by].team)
    for (const r of rounds) {
      const firstAttacks = r.n < half ? true : r.n < half * 2 ? false : (r.n - half * 2) % 2 === 0
      r.attacker = firstAttacks ? first : other(first)
    }
  }

  for (const r of rounds) {
    const first = r.kills.find((k) => k.killer >= 0 && k.victim >= 0)
    if (first) {
      players[first.killer].firstKills++
      players[first.victim].firstDeaths++
    }
    if (r.plant) players[r.plant.by].plants++
    if (r.defuse) players[r.defuse.by].defuses++
    const perKiller = new Map<number, number>()
    for (const k of r.kills) {
      if (k.killer < 0 || k.victim < 0 || players[k.killer].team === players[k.victim].team)
        continue
      perKiller.set(k.killer, (perKiller.get(k.killer) ?? 0) + 1)
    }
    for (const [killer, count] of perKiller) {
      if (count >= 3) players[killer].multi[Math.min(count, 5) - 3]++
    }
  }

  return {
    version: 1,
    id,
    map: String(info.mapId ?? '').toLowerCase(),
    queue,
    mode: String(info.gameMode ?? ''),
    start: Number(info.gameStartMillis ?? 0),
    length: Number(info.gameLengthMillis ?? 0),
    season: String(info.seasonId ?? '').toLowerCase(),
    ranked: info.isRanked === true,
    custom,
    completion: String(info.completionState ?? ''),
    teams,
    players,
    rounds
  }
}

function selfFacts(detail: MatchDetail, me: number, half: number): SelfFacts {
  const facts = emptyFacts()
  const player = detail.players[me]
  const team = player.team
  facts.plants = player.plants
  facts.defuses = player.defuses
  facts.casts = [...player.casts]

  for (const r of detail.rounds) {
    const mine = r.players[me]
    if (!mine) continue
    const won = r.winner === team
    facts.rounds++
    if (r.attacker) add(r.attacker === team ? facts.attack : facts.defense, won)

    const pistol = r.n === 0 || r.n === half
    if (pistol) {
      add(facts.pistol, won)
    } else {
      const loadouts = detail.players
        .map((p, i) => (p.team === team ? r.players[i]?.econ?.loadout : undefined))
        .filter((v): v is number => v !== undefined)
      if (loadouts.length) {
        const avg = loadouts.reduce((s, v) => s + v, 0) / loadouts.length
        add(avg < ECO_MAX ? facts.eco : avg < FULL_MIN ? facts.force : facts.full, won)
      }
    }

    const first = r.kills.find((k) => k.killer >= 0 && k.victim >= 0)
    if (first?.killer === me) add(facts.firstKill, won)
    if (first?.victim === me) add(facts.firstDeath, won)

    if (mine.econ?.weapon) {
      const w = weaponFact(facts, mine.econ.weapon)
      w.rounds++
      w.damage += mine.damage
      w.head += mine.head
      w.body += mine.body
      w.leg += mine.leg
    }
    for (const k of r.kills) {
      if (!UUID.test(k.weapon) || (k.kind !== 'weapon' && k.kind !== 'melee')) continue
      if (k.killer === me && k.victim >= 0 && detail.players[k.victim].team !== team) {
        weaponFact(facts, k.weapon).kills++
      }
      if (k.victim === me && k.killer >= 0 && detail.players[k.killer].team !== team) {
        weaponFact(facts, k.weapon).deaths++
      }
    }

    const alive = new Set(detail.players.map((_, i) => i).filter((i) => r.players[i]))
    let clutch = 0
    const check = (): void => {
      if (clutch || !alive.has(me)) return
      const allies = [...alive].filter((i) => detail.players[i].team === team)
      const enemies = [...alive].filter((i) => detail.players[i].team !== team)
      if (allies.length === 1 && enemies.length >= 1) clutch = Math.min(enemies.length, MAX_CLUTCH)
    }
    check()
    for (const k of r.kills) {
      alive.delete(k.victim)
      check()
    }
    if (clutch) add(facts.clutches[clutch - 1], won)
  }
  return facts
}

export function summarize(detail: MatchDetail, puuid: string): MatchSummary | null {
  const me = detail.players.findIndex((p) => p.puuid === puuid)
  if (me < 0) return null
  const player = detail.players[me]
  const myTeam = detail.teams.find((tm) => tm.id === player.team)
  const others = detail.teams.filter((tm) => tm.id !== player.team)
  const roundBased = detail.rounds.length > 0 && detail.teams.length === 2
  const anyWon = detail.teams.some((tm) => tm.won)
  const result = myTeam?.won ? 'win' : anyWon || !roundBased ? 'loss' : 'draw'
  const ally = roundBased ? (myTeam?.rounds ?? 0) : player.kills
  const enemy = roundBased
    ? Math.max(0, ...others.map((tm) => tm.rounds))
    : Math.max(0, ...detail.players.filter((_, i) => i !== me).map((p) => p.kills))

  const byScore = [...detail.players].sort((a, b) => b.score - a.score)
  const place = byScore.findIndex((p) => p.puuid === puuid) + 1
  const teamTop = byScore.find((p) => p.team === player.team)
  const mvp = place === 1 ? 'match' : teamTop?.puuid === puuid ? 'team' : null

  return {
    id: detail.id,
    map: detail.map,
    queue: detail.queue,
    mode: detail.mode,
    start: detail.start,
    length: detail.length,
    season: detail.season,
    custom: detail.custom,
    agent: player.agent,
    team: player.team,
    result,
    ally,
    enemy,
    kills: player.kills,
    deaths: player.deaths,
    assists: player.assists,
    score: player.score,
    rounds: player.rounds,
    damage: player.damage,
    head: player.head,
    body: player.body,
    leg: player.leg,
    multi: [...player.multi],
    place,
    players: detail.players.length,
    mvp: roundBased ? mvp : null,
    partySize: player.party ? detail.players.filter((p) => p.party === player.party).length : 1,
    tier: player.tier,
    rr: null,
    facts: roundBased ? selfFacts(detail, me, HALF[detail.queue] ?? 12) : null
  }
}
