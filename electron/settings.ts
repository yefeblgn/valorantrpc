import { existsSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { app } from 'electron'
import {
  DEFAULT_SETTINGS,
  UI_SCALES,
  WINDOW_SIZES,
  type ThemeMode,
  type WindowSizeKey,
  type LargeImageMode,
  type LargeTextMode,
  type Settings,
  type SmallImageMode,
  type SmallTextMode
} from '@shared/types'
import { sanitizeTemplates } from '@shared/templates'
import { APP_NAME, configPath, executablePath } from './constants'

const LARGE_IMAGE: LargeImageMode[] = ['auto', 'map', 'agent', 'rank', 'playercard']
const LARGE_TEXT: LargeTextMode[] = ['auto', 'playerName', 'level', 'mode', 'mapName']
const SMALL_IMAGE: SmallImageMode[] = ['auto', 'agent', 'rank', 'mode', 'playercard', 'map', 'none']
const SMALL_TEXT: SmallTextMode[] = [
  'auto',
  'agentName',
  'score',
  'rank',
  'mode',
  'playerName',
  'level'
]

let cache: Settings | null = null

export function loadSettings(): Settings {
  if (cache) return cache
  let data: Partial<Settings> = {}
  try {
    if (existsSync(configPath())) {
      data = JSON.parse(readFileSync(configPath(), 'utf-8')) as Partial<Settings>
    }
  } catch (e) {
    console.warn('[settings] load error:', e)
  }
  cache = sanitize({ ...DEFAULT_SETTINGS, ...data })
  return cache
}

function saveSettings(s: Settings): void {
  cache = s
  const path = configPath()
  const tmp = `${path}.tmp`
  try {
    writeFileSync(tmp, JSON.stringify(s, null, 2), 'utf-8')
    renameSync(tmp, path)
  } catch (e) {
    console.warn('[settings] save error:', e)
  }
}

export function updateSettings(patch: Partial<Settings>): Settings {
  const next = sanitize({ ...loadSettings(), ...patch })
  saveSettings(next)
  return next
}

function oneOf<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function sanitize(s: Settings): Settings {
  const d = DEFAULT_SETTINGS
  return {
    ...s,
    language: s.language === 'tr' ? 'tr' : 'en',
    languageDetected: bool(s.languageDetected, d.languageDetected),
    rpcEnabled: bool(s.rpcEnabled, d.rpcEnabled),
    autostart: bool(s.autostart, d.autostart),
    startMinimized: bool(s.startMinimized, d.startMinimized),
    closeToTray: bool(s.closeToTray, d.closeToTray),
    autoCheckUpdates: bool(s.autoCheckUpdates, d.autoCheckUpdates),
    notifyOnDetect: bool(s.notifyOnDetect, d.notifyOnDetect),
    sidebarCollapsed: bool(s.sidebarCollapsed, d.sidebarCollapsed),
    theme: oneOf<ThemeMode>(s.theme, ['dark', 'light', 'system'], d.theme),
    windowSize: oneOf<WindowSizeKey>(
      s.windowSize,
      ['auto', ...(Object.keys(WINDOW_SIZES) as WindowSizeKey[])],
      d.windowSize
    ),
    uiScale: UI_SCALES.includes(s.uiScale) ? s.uiScale : d.uiScale,
    boldText: bool(s.boldText, d.boldText),
    highContrast: bool(s.highContrast, d.highContrast),
    reduceMotion: bool(s.reduceMotion, d.reduceMotion),
    pollInterval: Math.min(Math.max(Math.round(Number(s.pollInterval)) || 2, 1), 10),
    accentColor: /^#[0-9a-fA-F]{6}$/.test(s.accentColor) ? s.accentColor : d.accentColor,
    showElapsed: bool(s.showElapsed, d.showElapsed),
    showParty: bool(s.showParty, d.showParty),
    showRank: bool(s.showRank, d.showRank),
    showLevel: bool(s.showLevel, d.showLevel),
    showScore: bool(s.showScore, d.showScore),
    showButton: bool(s.showButton, d.showButton),
    buttonLabel: String(s.buttonLabel ?? '').slice(0, 32),
    buttonUrl: String(s.buttonUrl ?? '')
      .trim()
      .slice(0, 512),
    discordInvites: bool(s.discordInvites, d.discordInvites),
    streamerMode: bool(s.streamerMode, d.streamerMode),
    largeImage: oneOf(s.largeImage, LARGE_IMAGE, d.largeImage),
    largeText: oneOf(s.largeText, LARGE_TEXT, d.largeText),
    smallImage: oneOf(s.smallImage, SMALL_IMAGE, d.smallImage),
    smallText: oneOf(s.smallText, SMALL_TEXT, d.smallText),
    templatesEnabled: bool(s.templatesEnabled, d.templatesEnabled),
    templates: sanitizeTemplates(s.templates),
    autolockEnabled: bool(s.autolockEnabled, d.autolockEnabled),
    autolockAgent: typeof s.autolockAgent === 'string' ? s.autolockAgent : d.autolockAgent,
    overlayEnabled: bool(s.overlayEnabled, d.overlayEnabled),
    overlayHotkey:
      typeof s.overlayHotkey === 'string' && s.overlayHotkey.trim()
        ? s.overlayHotkey.trim().slice(0, 48)
        : d.overlayHotkey
  }
}

const LEGACY_LOGIN_NAME = 'electron.app.ValorantRPC'

export function setAutostart(enabled: boolean): void {
  if (!app.isPackaged) return
  try {
    app.setLoginItemSettings({ openAtLogin: false, name: LEGACY_LOGIN_NAME })
    app.setLoginItemSettings({
      openAtLogin: enabled,
      name: APP_NAME,
      path: executablePath(),
      args: []
    })
  } catch (e) {
    console.warn('[settings] autostart error:', e)
  }
}
