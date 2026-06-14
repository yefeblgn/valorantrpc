import type { GameState, SessionState } from '@shared/types'

export function idleState(name = '', tag = ''): GameState {
  return {
    sessionState: 'idle',
    queueId: '',
    provisioningFlow: '',
    mapPath: '',
    partySize: 0,
    partyMax: 5,
    competitiveTier: 0,
    accountLevel: 0,
    cardId: '',
    allyScore: null,
    enemyScore: null,
    agentUuid: '',
    rr: null,
    name,
    tag,
    isIdle: false,
    partyState: '',
    queueEntryTime: ''
  }
}


export function signature(s: GameState): string {
  return [
    s.sessionState,
    s.queueId,
    s.mapPath,
    s.agentUuid,
    s.partySize,
    s.partyMax,
    s.competitiveTier,
    s.rr,
    s.allyScore,
    s.enemyScore,
    s.partyState
  ].join('|')
}

export function isQueuing(s: GameState): boolean {
  return s.sessionState === 'menus' && s.partyState.toUpperCase() === 'MATCHMAKING'
}

export function isCustom(s: GameState): boolean {
  return (
    (s.provisioningFlow || '').toLowerCase().includes('custom') ||
    (s.queueId || '').toLowerCase() === 'custom'
  )
}


export function parsePresence(priv: Record<string, unknown> | null): GameState {
  const state = idleState()
  if (!priv || Object.keys(priv).length === 0) return state

  const matchD = (priv.matchPresenceData as Record<string, unknown>) || {}
  const partyD = (priv.partyPresenceData as Record<string, unknown>) || {}
  const playerD = (priv.playerPresenceData as Record<string, unknown>) || {}

  const pick = (key: string, ...sources: Record<string, unknown>[]): unknown => {
    for (const s of sources) {
      const v = s[key]
      if (v !== undefined && v !== null) return v
    }
    return null
  }

  const loop = String(pick('sessionLoopState', matchD, priv) || '').toUpperCase()
  const loopMap: Record<string, SessionState> = {
    MENUS: 'menus',
    PREGAME: 'pregame',
    INGAME: 'ingame'
  }
  state.sessionState = loopMap[loop] ?? 'menus'
  state.queueId = String(pick('queueId', matchD, priv) || '')
  state.provisioningFlow = String(pick('provisioningFlow', matchD, priv) || '')
  state.mapPath = String(pick('matchMap', matchD, priv) || '')
  state.partySize = Number(pick('partySize', priv, partyD) || 0)
  state.partyMax = Number(pick('maxPartySize', priv, partyD) || 5)
  state.competitiveTier = Number(pick('competitiveTier', playerD, priv) || 0)
  state.accountLevel = Number(pick('accountLevel', playerD, priv) || 0)
  state.cardId = String(pick('playerCardId', playerD, priv) || '')
  state.agentUuid = String(pick('characterId', playerD, priv) || '')
  state.isIdle = Boolean(priv.isIdle ?? false)
  state.partyState = String(pick('partyState', partyD, priv) || '')
  state.queueEntryTime = String(pick('queueEntryTime', partyD, priv) || '')

  const ally = pick('partyOwnerMatchScoreAllyTeam', priv, partyD)
  const enemy = pick('partyOwnerMatchScoreEnemyTeam', priv, partyD)
  if (ally !== null) state.allyScore = Number(ally)
  if (enemy !== null) state.enemyScore = Number(enemy)

  return state
}
