import type {
  BuiltPresence,
  DisplayInfo,
  GameState,
  Language,
  LargeTextMode,
  Settings,
  SmallImageMode,
  SmallTextMode
} from '@shared/types'
import { FALLBACK_LARGE_IMAGE } from '../constants'
import { t } from '@shared/i18n'
import type { Content } from '../riot/content'
import { isCustom, isQueuing } from './state'

function levelText(state: GameState, language: Language): string {
  return `${t(language, 'level')} ${state.accountLevel}`
}

function largeCard(
  state: GameState,
  settings: Settings,
  language: Language
): [string, string] {
  const text =
    settings.showLevel && state.accountLevel
      ? levelText(state, language)
      : t(language, 'app_title')
  return [FALLBACK_LARGE_IMAGE, text]
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
  if (isQueuing(state)) p.state = t(language, 'queuing')

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
  const [mapName, splash] = content.mapInfo(state.mapPath)
  const [largeImage, largeText] = splash
    ? [splash, mapName]
    : largeCard(state, settings, language)

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

function buildIngame(
  state: GameState,
  settings: Settings,
  content: Content,
  language: Language
): BuiltPresence {
  const [mapName, splash] = content.mapInfo(state.mapPath)
  const [largeImage, largeText] = splash
    ? [splash, mapName]
    : largeCard(state, settings, language)

  const details = isCustom(state) ? t(language, 'custom') : content.modeName(state.queueId)

  const showScore =
    settings.showScore && state.allyScore !== null && state.enemyScore !== null
  const stateLine = showScore
    ? `${t(language, 'p_in_game')} · ${state.allyScore} - ${state.enemyScore}`
    : t(language, 'p_in_game')

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
      return content.modeName(state.queueId)
    case 'mapName':
      return content.mapInfo(state.mapPath)[0]
    case 'agentName':
      return content.agentName(state.agentUuid)
    case 'score':
      return state.allyScore !== null && state.enemyScore !== null
        ? `${state.allyScore} - ${state.enemyScore}`
        : ''
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


export function buildPresence(
  state: GameState,
  settings: Settings,
  content: Content,
  language: Language,
  startTs: number
): BuiltPresence | null {
  if (state.sessionState === 'idle') return null

  let p: BuiltPresence
  if (state.sessionState === 'ingame') p = buildIngame(state, settings, content, language)
  else if (state.sessionState === 'pregame') p = buildPregame(state, settings, content, language)
  else p = buildMenu(state, settings, content, language)

  applyOverrides(p, state, settings, content, language)

  if (settings.showElapsed) p.startTimestamp = startTs
  if (settings.showParty && state.partySize > 0) {
    p.partySize = [state.partySize, state.partyMax]
  }
  if (settings.showButton) {
    const label = settings.buttonLabel?.trim() || 'Made by ❤️ yefeblgn'
    const url = settings.buttonUrl?.trim() || 'https://github.com/yefeblgn/valorantrpc'
    p.buttons = [{ label, url }]
  }

  return p
}


export function buildDisplay(
  state: GameState,
  content: Content
): DisplayInfo {
  const [mapName, mapSplash] = content.mapInfo(state.mapPath)
  return {
    statusKey: state.sessionState,
    isQueuing: isQueuing(state),
    isCustom: isCustom(state),
    modeName: content.modeName(state.queueId),
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
