import type {
  BuiltPresence,
  DisplayInfo,
  GameState,
  Language,
  LargeTextMode,
  ScoreInfo,
  Settings,
  SmallImageMode,
  SmallTextMode
} from '@shared/types'
import { DEFAULT_SETTINGS } from '@shared/types'
import { renderTemplate, type TemplateState, type TemplateValues } from '@shared/templates'
import type { SessionSummary } from '@shared/history'
import { FALLBACK_LARGE_IMAGE } from '../constants'
import { t } from '@shared/i18n'
import type { Content } from '../riot/content'
import { inRange, isCustom, isMatchFound, isQueuing } from './state'

const HTTP_URL = /^https?:\/\/[^\s]+$/i
const DEFAULT_BUTTON = {
  label: DEFAULT_SETTINGS.buttonLabel,
  url: DEFAULT_SETTINGS.buttonUrl
}

function levelText(state: GameState, language: Language): string {
  return `${t(language, 'level')} ${state.accountLevel}`
}

function largeCard(state: GameState, settings: Settings, language: Language): [string, string] {
  const text =
    settings.showLevel && state.accountLevel ? levelText(state, language) : t(language, 'app_title')
  return [FALLBACK_LARGE_IMAGE, text]
}

function largeFallback(
  state: GameState,
  settings: Settings,
  content: Content,
  language: Language
): [string, string] {
  const [mapName, splash] = content.mapInfo(state.mapPath)
  if (splash) return [splash, mapName]
  const art = content.modeArt(state.queueId)
  if (art) return [art, content.modeName(state.queueId)]
  return largeCard(state, settings, language)
}

function rangeQueued(state: GameState): boolean {
  return inRange(state) && (isQueuing(state) || isMatchFound(state))
}

function modeLabel(state: GameState, content: Content, language: Language): string {
  if (inRange(state) && !rangeQueued(state)) return t(language, 'range')
  return content.modeName(state.queueId)
}

function scoreInfo(state: GameState, content: Content): ScoreInfo | null {
  if (inRange(state)) return null
  if (state.allyScore === null || state.enemyScore === null) return null
  if (content.usesTeamHealth(state.queueId)) {
    return state.enemyScore > 0 ? { kind: 'health', hp: state.enemyScore } : null
  }
  return { kind: 'rounds', ally: state.allyScore, enemy: state.enemyScore }
}

function scoreText(state: GameState, content: Content, language: Language): string {
  const score = scoreInfo(state, content)
  if (!score) return ''
  return score.kind === 'health'
    ? `${score.hp} ${t(language, 'hp')}`
    : `${score.ally} - ${score.enemy}`
}

function rankSmall(state: GameState, content: Content): [string | null, string] {
  const icon = content.tierIcon(state.competitiveTier)
  const name = content.tierName(state.competitiveTier)
  if (state.rr !== null && name) return [icon, `${name} · ${state.rr} RR`]
  return [icon, name]
}

function buildMenu(
  state: GameState,
  settings: Settings,
  content: Content,
  language: Language
): BuiltPresence {
  let largeImage: string
  let largeText: string
  if (state.cardId) {
    largeImage = content.cardSquare(state.cardId) || FALLBACK_LARGE_IMAGE
    largeText = state.name ? `${state.name}#${state.tag}` : t(language, 'app_title')
  } else {
    ;[largeImage, largeText] = largeCard(state, settings, language)
  }

  const details = isCustom(state)
    ? t(language, 'custom')
    : state.queueId
      ? content.modeName(state.queueId)
      : t(language, 'p_in_menu')

  const p: BuiltPresence = { details, largeImage, largeText }
  if (isMatchFound(state)) p.state = t(language, 'match_found')
  else if (isQueuing(state)) p.state = t(language, 'queuing')

  const isComp = content.queueKey(state.queueId) === 'competitive'
  if (isComp) {
    if (settings.showRank && state.competitiveTier > 0) {
      const [icon, text] = rankSmall(state, content)
      if (icon) {
        p.smallImage = icon
        p.smallText = text
      }
    } else {
      const icon = content.tierIcon(state.competitiveTier > 0 ? state.competitiveTier : 0)
      if (icon) {
        p.smallImage = icon
        p.smallText = content.modeName(state.queueId)
      }
    }
  } else {
    const icon = content.modeIcon(state.queueId)
    if (icon) {
      p.smallImage = icon
      p.smallText = content.modeName(state.queueId)
    }
  }
  return p
}

function buildPregame(
  state: GameState,
  settings: Settings,
  content: Content,
  language: Language
): BuiltPresence {
  const [largeImage, largeText] = largeFallback(state, settings, content, language)

  const p: BuiltPresence = {
    details: t(language, 'p_selecting_agent'),
    largeImage,
    largeText
  }

  const agentIcon = content.agentIcon(state.agentUuid)
  const agentName = content.agentName(state.agentUuid)
  if (agentIcon) {
    p.smallImage = agentIcon
    p.smallText = agentName || ''
    if (agentName) p.state = agentName
  } else {
    const icon = content.tierIcon(0)
    if (icon) {
      p.smallImage = icon
      p.smallText = t(language, 'p_selecting_agent')
    }
  }
  return p
}

function buildRange(
  state: GameState,
  settings: Settings,
  content: Content,
  language: Language
): BuiltPresence {
  const [, splash] = content.mapInfo(state.mapPath)
  const [largeImage, largeText] = splash
    ? [splash, t(language, 'range')]
    : largeCard(state, settings, language)

  const queued = rangeQueued(state)
  const mode = state.queueId ? content.modeName(state.queueId) : ''
  const status = isMatchFound(state)
    ? t(language, 'match_found')
    : isQueuing(state)
      ? t(language, 'queuing')
      : t(language, 'p_warming_up')

  const p: BuiltPresence = {
    details: t(language, 'p_in_range'),
    state: queued && mode ? `${status} · ${mode}` : status,
    largeImage,
    largeText
  }

  const agentIcon = content.agentIcon(state.agentUuid)
  if (agentIcon) {
    p.smallImage = agentIcon
    p.smallText = content.agentName(state.agentUuid) || t(language, 'range')
  } else if (queued && mode) {
    const icon = content.modeIcon(state.queueId)
    if (icon) {
      p.smallImage = icon
      p.smallText = mode
    }
  } else {
    p.smallImage = content.rangeIcon()
    p.smallText = t(language, 'range')
  }
  return p
}

function buildIngame(
  state: GameState,
  settings: Settings,
  content: Content,
  language: Language
): BuiltPresence {
  const [largeImage, largeText] = largeFallback(state, settings, content, language)

  const details = isCustom(state) ? t(language, 'custom') : content.modeName(state.queueId)

  const score = settings.showScore ? scoreText(state, content, language) : ''
  const stateLine = score ? `${t(language, 'p_in_game')} · ${score}` : t(language, 'p_in_game')

  const p: BuiltPresence = { details, state: stateLine, largeImage, largeText }

  const agentIcon = content.agentIcon(state.agentUuid)
  const agentName = content.agentName(state.agentUuid)
  if (agentIcon) {
    p.smallImage = agentIcon
    p.smallText = agentName || content.modeName(state.queueId)
  } else {
    const icon = content.modeIconUnique(state.queueId)
    if (icon) {
      p.smallImage = icon
      p.smallText = content.modeName(state.queueId)
    }
  }
  return p
}

function imageFor(
  mode: Exclude<SmallImageMode, 'auto' | 'none'>,
  state: GameState,
  content: Content
): string | null {
  switch (mode) {
    case 'map':
      return content.mapInfo(state.mapPath)[1]
    case 'agent':
      return content.agentIcon(state.agentUuid)
    case 'rank':
      return content.tierIcon(state.competitiveTier > 0 ? state.competitiveTier : 0)
    case 'playercard':
      return content.cardSquare(state.cardId)
    case 'mode':
      return content.modeIcon(state.queueId)
    default:
      return null
  }
}

function textFor(
  mode: Exclude<LargeTextMode | SmallTextMode, 'auto'>,
  state: GameState,
  content: Content,
  language: Language
): string {
  switch (mode) {
    case 'playerName':
      return state.name ? `${state.name}#${state.tag}` : ''
    case 'level':
      return state.accountLevel ? levelText(state, language) : ''
    case 'mode':
      return modeLabel(state, content, language)
    case 'mapName':
      return content.mapInfo(state.mapPath)[0]
    case 'agentName':
      return content.agentName(state.agentUuid)
    case 'score':
      return scoreText(state, content, language)
    case 'rank': {
      const name = content.tierName(state.competitiveTier)
      if (!name) return ''
      return state.rr !== null ? `${name} · ${state.rr} RR` : name
    }
    default:
      return ''
  }
}

function applyOverrides(
  p: BuiltPresence,
  state: GameState,
  settings: Settings,
  content: Content,
  language: Language
): void {
  if (settings.largeImage !== 'auto') {
    const img = imageFor(settings.largeImage, state, content)
    if (img) p.largeImage = img
  }
  if (settings.largeText !== 'auto') {
    const txt = textFor(settings.largeText, state, content, language)
    if (txt) p.largeText = txt
  }
  if (settings.smallImage === 'none') {
    delete p.smallImage
    delete p.smallText
  } else if (settings.smallImage !== 'auto') {
    const img = imageFor(settings.smallImage, state, content)
    if (img) p.smallImage = img
  }
  if (settings.smallText !== 'auto') {
    const txt = textFor(settings.smallText, state, content, language)
    if (txt) p.smallText = txt
  }
}

function publicState(state: GameState, settings: Settings): GameState {
  if (!settings.streamerMode) return state
  return { ...state, name: '', tag: '', competitiveTier: 0, rr: null, accountLevel: 0 }
}

function templateKey(state: GameState): TemplateState {
  if (inRange(state)) return 'range'
  if (state.sessionState === 'ingame') return 'ingame'
  if (state.sessionState === 'pregame') return 'pregame'
  return 'menus'
}

function statusLine(state: GameState, language: Language): string {
  if (isMatchFound(state)) return t(language, 'match_found')
  if (isQueuing(state)) return t(language, 'queuing')
  if (inRange(state)) return t(language, 'p_in_range')
  if (state.sessionState === 'ingame') return t(language, 'p_in_game')
  if (state.sessionState === 'pregame') return t(language, 'p_selecting_agent')
  return t(language, 'p_in_menu')
}

export function sessionText(
  session: SessionSummary | null,
  language: Language,
  hideRr: boolean
): string {
  if (!session) return ''
  const record = `${session.wins}${t(language, 'wins_short')} ${session.losses}${t(language, 'losses_short')}`
  if (hideRr || !session.rrKnown) return record
  return `${record} · ${session.rr > 0 ? '+' : ''}${session.rr} RR`
}

function templateValues(
  state: GameState,
  settings: Settings,
  content: Content,
  language: Language,
  session: SessionSummary | null
): TemplateValues {
  return {
    mode: isCustom(state) ? t(language, 'custom') : modeLabel(state, content, language),
    map: content.mapInfo(state.mapPath)[0],
    agent: content.agentName(state.agentUuid),
    score: scoreText(state, content, language),
    rank: content.tierName(state.competitiveTier),
    rr: state.rr !== null && state.competitiveTier > 0 ? `${state.rr} RR` : '',
    level: state.accountLevel ? String(state.accountLevel) : '',
    player: state.name ? `${state.name}#${state.tag}` : '',
    party: state.partySize > 0 ? `${state.partySize}/${state.partyMax}` : '',
    status: statusLine(state, language),
    session: sessionText(session, language, settings.streamerMode)
  }
}

function applyTemplates(
  p: BuiltPresence,
  state: GameState,
  settings: Settings,
  content: Content,
  language: Language,
  session: SessionSummary | null
): void {
  const lines = settings.templates[templateKey(state)]
  if (!lines.details.trim() && !lines.state.trim()) return
  const values = templateValues(state, settings, content, language, session)
  const details = lines.details.trim() ? renderTemplate(lines.details, values) : ''
  const stateLine = lines.state.trim() ? renderTemplate(lines.state, values) : ''
  if (details) p.details = details
  if (stateLine) p.state = stateLine
}

export interface PartyInvite {
  partyId: string
  secret: string
}

export function canInvite(state: GameState): boolean {
  return (
    state.sessionState === 'menus' &&
    !isQueuing(state) &&
    !isMatchFound(state) &&
    !!state.partyId &&
    state.partySize > 0 &&
    state.partySize < state.partyMax
  )
}

export function buildPresence(
  rawState: GameState,
  settings: Settings,
  content: Content,
  language: Language,
  startTs: number,
  invite: PartyInvite | null = null,
  session: SessionSummary | null = null
): BuiltPresence | null {
  if (rawState.sessionState === 'idle') return null
  const state = publicState(rawState, settings)

  let p: BuiltPresence
  if (inRange(state)) p = buildRange(state, settings, content, language)
  else if (state.sessionState === 'ingame') p = buildIngame(state, settings, content, language)
  else if (state.sessionState === 'pregame') p = buildPregame(state, settings, content, language)
  else p = buildMenu(state, settings, content, language)

  applyOverrides(p, state, settings, content, language)
  if (settings.templatesEnabled) applyTemplates(p, state, settings, content, language, session)

  if (settings.showElapsed) p.startTimestamp = startTs
  if (settings.showParty && state.partySize > 0) {
    p.partySize = [state.partySize, state.partyMax]
  }

  if (settings.discordInvites && !settings.streamerMode && invite && canInvite(state)) {
    p.partySize = [state.partySize, state.partyMax]
    p.partyId = invite.partyId
    p.joinSecret = invite.secret
  } else if (settings.showButton) {
    const label = settings.buttonLabel.trim() || DEFAULT_BUTTON.label
    const url = settings.buttonUrl.trim()
    p.buttons = [{ label, url: HTTP_URL.test(url) ? url : DEFAULT_BUTTON.url }]
  }

  return p
}

export function buildDisplay(state: GameState, content: Content): DisplayInfo {
  const [mapName, mapSplash] = content.mapInfo(state.mapPath)
  return {
    statusKey: state.sessionState,
    isQueuing: isQueuing(state),
    isMatchFound: isMatchFound(state),
    isRange: inRange(state),
    isCustom: isCustom(state),
    modeName: modeLabel(state, content, content.language),
    score: scoreInfo(state, content),
    mapName,
    mapSplash,
    agentName: content.agentName(state.agentUuid),
    agentIcon: state.agentUuid ? content.agentIcon(state.agentUuid) : null,
    tierName: content.tierName(state.competitiveTier),
    tierIcon: content.tierIcon(state.competitiveTier),
    cardWide: content.cardWide(state.cardId),
    cardSquare: content.cardSquare(state.cardId)
  }
}
