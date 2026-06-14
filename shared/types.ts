

export type PageKey = 'home' | 'settings' | 'about'

export type Language = 'tr' | 'en'

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
  rr: number | null
  name: string
  tag: string
  isIdle: boolean
  partyState: string
  queueEntryTime: string
}


export type LargeImageMode = 'auto' | 'map' | 'agent' | 'rank' | 'playercard'
export type LargeTextMode = 'auto' | 'playerName' | 'level' | 'mode' | 'mapName'
export type SmallImageMode =
  | 'auto'
  | 'agent'
  | 'rank'
  | 'mode'
  | 'playercard'
  | 'map'
  | 'none'
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
  
  accentColor: string
  
  showElapsed: boolean
  showParty: boolean
  showRank: boolean
  showLevel: boolean
  showScore: boolean
  showButton: boolean
  buttonLabel: string
  buttonUrl: string
  
  largeImage: LargeImageMode
  largeText: LargeTextMode
  smallImage: SmallImageMode
  smallText: SmallTextMode
  
  autolockEnabled: boolean
  autolockAgent: string
}

export const DEFAULT_SETTINGS: Settings = {
  language: 'en',
  languageDetected: false,
  rpcEnabled: true,
  autostart: false,
  startMinimized: false,
  closeToTray: true,
  pollInterval: 2,
  autoCheckUpdates: true,
  accentColor: '#ff4655',
  showElapsed: true,
  showParty: true,
  showRank: true,
  showLevel: true,
  showScore: true,
  showButton: true,
  buttonLabel: 'Made by ❤️ yefeblgn',
  buttonUrl: 'https://github.com/yefeblgn/valorantrpc',
  largeImage: 'auto',
  largeText: 'auto',
  smallImage: 'auto',
  smallText: 'auto',
  autolockEnabled: false,
  autolockAgent: ''
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

export interface PlayerInfo {
  name: string
  tag: string
}


export interface DisplayInfo {
  statusKey: 'idle' | 'menus' | 'pregame' | 'ingame'
  isQueuing: boolean
  isCustom: boolean
  modeName: string
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
}

export interface AgentOption {
  uuid: string
  name: string
}

export interface UpdateInfo {
  available: boolean
  currentVersion: string
  latestVersion: string
  downloading: boolean
  progress: number 
  bytesPerSecond: number
  downloaded: boolean
  error: string | null
}
