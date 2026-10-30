import { DEFAULT_TEMPLATES, type PresenceTemplates } from './templates'

export type PageKey = 'home' | 'match' | 'career' | 'settings' | 'about'

export const LANGUAGES = ['tr', 'en', 'es', 'fr', 'ja', 'zh', 'ar'] as const

export type Language = (typeof LANGUAGES)[number]

export const LANGUAGE_NAMES: Record<Language, string> = {
  tr: 'Türkçe',
  en: 'English',
  es: 'Español',
  fr: 'Français',
  ja: '日本語',
  zh: '简体中文',
  ar: 'العربية'
}

export const RTL_LANGUAGES: readonly Language[] = ['ar']

export type SessionState = 'idle' | 'menus' | 'pregame' | 'ingame'

export interface GameState {
  sessionState: SessionState
  queueId: string
  provisioningFlow: string
  mapPath: string
  partySize: number
  partyMax: number
  competitiveTier: number
  accountLevel: number
  cardId: string
  allyScore: number | null
  enemyScore: number | null
  agentUuid: string
  partyId: string
  rr: number | null
  name: string
  tag: string
  isIdle: boolean
  partyState: string
  queueEntryTime: string
}

export type ThemeMode = 'dark' | 'light' | 'system'
export type WindowSizeKey = 'auto' | 'small' | 'medium' | 'large' | 'xlarge'
export type UiScale = 90 | 100 | 110 | 125

export const WINDOW_SIZES: Record<Exclude<WindowSizeKey, 'auto'>, [number, number]> = {
  small: [1024, 640],
  medium: [1152, 720],
  large: [1280, 800],
  xlarge: [1440, 900]
}
export const UI_SCALES: UiScale[] = [90, 100, 110, 125]

export interface WindowInfo {
  auto: Exclude<WindowSizeKey, 'auto'>
  fits: Exclude<WindowSizeKey, 'auto'>[]
}

export type LargeImageMode = 'auto' | 'map' | 'agent' | 'rank' | 'playercard'
export type LargeTextMode = 'auto' | 'playerName' | 'level' | 'mode' | 'mapName'
export type SmallImageMode = 'auto' | 'agent' | 'rank' | 'mode' | 'playercard' | 'map' | 'none'
export type SmallTextMode =
  | 'auto'
  | 'agentName'
  | 'score'
  | 'rank'
  | 'mode'
  | 'playerName'
  | 'level'

export interface Settings {
  language: Language
  languageDetected: boolean
  rpcEnabled: boolean
  autostart: boolean
  startMinimized: boolean
  closeToTray: boolean
  pollInterval: number
  autoCheckUpdates: boolean
  notifyOnDetect: boolean

  accentColor: string
  sidebarCollapsed: boolean
  theme: ThemeMode
  windowSize: WindowSizeKey
  uiScale: UiScale
  boldText: boolean
  highContrast: boolean
  reduceMotion: boolean

  showElapsed: boolean
  showParty: boolean
  showRank: boolean
  showLevel: boolean
  showScore: boolean
  showButton: boolean
  buttonLabel: string
  buttonUrl: string
  discordInvites: boolean
  streamerMode: boolean

  largeImage: LargeImageMode
  largeText: LargeTextMode
  smallImage: SmallImageMode
  smallText: SmallTextMode

  templatesEnabled: boolean
  templates: PresenceTemplates

  autolockEnabled: boolean
  autolockAgent: string

  overlayEnabled: boolean
  overlayHotkey: string
  hudEnabled: boolean
  hudCompact: boolean
  hudLayout: HudLayout

  historyEnabled: boolean
  postMatchNotify: boolean
  tiltEnabled: boolean
  tiltThreshold: number
  rankGoal: number
}

export interface HudLayout {
  x: number
  y: number
  scale: number
  opacity: number
}

export const DEFAULT_HUD_LAYOUT: HudLayout = { x: 0.975, y: 0.17, scale: 1, opacity: 0.88 }
export const HUD_SCALE_RANGE: [number, number] = [0.7, 1.4]
export const HUD_OPACITY_RANGE: [number, number] = [0.5, 1]
export const TILT_RANGE: [number, number] = [2, 6]

export const DEFAULT_SETTINGS: Settings = {
  language: 'en',
  languageDetected: false,
  rpcEnabled: true,
  autostart: false,
  startMinimized: false,
  closeToTray: true,
  pollInterval: 2,
  autoCheckUpdates: true,
  notifyOnDetect: true,
  accentColor: '#ff4655',
  sidebarCollapsed: false,
  theme: 'dark',
  windowSize: 'auto',
  uiScale: 100,
  boldText: false,
  highContrast: false,
  reduceMotion: false,
  showElapsed: true,
  showParty: true,
  showRank: true,
  showLevel: true,
  showScore: true,
  showButton: true,
  buttonLabel: 'Made by ❤️ yefeblgn',
  buttonUrl: 'https://github.com/yefeblgn/valorantrpc',
  discordInvites: true,
  streamerMode: false,
  largeImage: 'auto',
  largeText: 'auto',
  smallImage: 'auto',
  smallText: 'auto',
  templatesEnabled: false,
  templates: DEFAULT_TEMPLATES,
  autolockEnabled: false,
  autolockAgent: '',
  overlayEnabled: false,
  overlayHotkey: 'Ctrl+T',
  hudEnabled: true,
  hudCompact: false,
  hudLayout: DEFAULT_HUD_LAYOUT,
  historyEnabled: true,
  postMatchNotify: true,
  tiltEnabled: false,
  tiltThreshold: 3,
  rankGoal: 0
}

export interface PlayerStats {
  rankTier: number
  rankName: string
  rankIcon: string | null
  rr: number | null
  peakTier: number
  peakName: string
  peakIcon: string | null
  peakAct: string
  wins: number
  games: number
  kd: number | null
  kda: number | null
  hs: number | null
  sample: number
}

export interface MatchPlayer {
  puuid: string
  name: string
  tag: string
  hidden: boolean
  isSelf: boolean
  inParty: boolean
  agentName: string
  agentIcon: string | null
  locked: boolean
  level: number | null
  stats: PlayerStats | null
  statsState: 'loading' | 'ready' | 'error'
}

export interface MatchTeam {
  id: string
  ally: boolean
  players: MatchPlayer[]
  avgRank: { name: string; icon: string | null } | null
}

export interface MapAgentStat {
  uuid: string
  name: string
  icon: string | null
  games: number
  wins: number
}

export interface MapStats {
  state: 'syncing' | 'ready'
  sample: number
  agents: MapAgentStat[]
}

export interface MatchReport {
  matchId: string
  phase: 'pregame' | 'ingame'
  mapName: string
  mapSplash: string | null
  mapIcon: string | null
  modeName: string
  modeIcon: string | null
  teams: MatchTeam[]
  mapStats: MapStats | null
}

export interface NavigateTarget {
  page: PageKey
  matchId?: string
}

export type ShareAction = 'copy' | 'save'

export interface TransferResult {
  ok: boolean
  count: number
  error?: string
}

export interface OverlayView {
  tracker: boolean
  hud: boolean
}

export interface BuiltPresence {
  details?: string
  state?: string
  largeImage?: string
  largeText?: string
  smallImage?: string
  smallText?: string
  startTimestamp?: number
  partySize?: [number, number]
  partyId?: string
  joinSecret?: string
  buttons?: { label: string; url: string }[]
}

export interface ConnectionStatus {
  valorant: boolean
  discord: boolean
}

export interface DiscordUser {
  id: string
  username: string
  globalName: string
  avatar: string | null
}

export interface JoinRequest {
  id: string
  username: string
  globalName: string
  avatar: string | null
  expiresAt: number
}

export interface PlayerInfo {
  name: string
  tag: string
}

export type ScoreInfo =
  | { kind: 'rounds'; ally: number; enemy: number }
  | { kind: 'health'; hp: number }

export interface DisplayInfo {
  statusKey: 'idle' | 'menus' | 'pregame' | 'ingame'
  isQueuing: boolean
  isMatchFound: boolean
  isRange: boolean
  isCustom: boolean
  modeName: string
  score: ScoreInfo | null
  mapName: string
  mapSplash: string | null
  agentName: string
  agentIcon: string | null
  tierName: string
  tierIcon: string | null
  cardWide: string | null
  cardSquare: string | null
}

export interface Snapshot {
  state: GameState
  connection: ConnectionStatus
  player: PlayerInfo
  presence: BuiltPresence | null
  display: DisplayInfo
  discordUser: DiscordUser | null
  joinRequests: JoinRequest[]
}

export interface AgentOption {
  uuid: string
  name: string
  role: string
  icon: string
  isNew: boolean
}

export interface UpdateInfo {
  checking: boolean
  checkedAt: number | null
  portable: boolean
  available: boolean
  currentVersion: string
  latestVersion: string
  downloading: boolean
  progress: number
  bytesPerSecond: number
  downloaded: boolean
  error: string | null
}
