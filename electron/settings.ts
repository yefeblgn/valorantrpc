import { existsSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { app } from 'electron'
import {
  DEFAULT_SETTINGS,
  type LargeImageMode,
  type LargeTextMode,
  type Settings,
  type SmallImageMode,
  type SmallTextMode
} from '@shared/types'
import { configPath, executablePath } from './constants'

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
    pollInterval: Math.min(Math.max(Math.round(Number(s.pollInterval)) || 2, 1), 10),
    accentColor: /^#[0-9a-fA-F]{6}$/.test(s.accentColor) ? s.accentColor : d.accentColor,
    showElapsed: bool(s.showElapsed, d.showElapsed),
    showParty: bool(s.showParty, d.showParty),
    showRank: bool(s.showRank, d.showRank),
    showLevel: bool(s.showLevel, d.showLevel),
    showScore: bool(s.showScore, d.showScore),
    showButton: bool(s.showButton, d.showButton),
    buttonLabel: String(s.buttonLabel ?? '').slice(0, 32),
    buttonUrl: String(s.buttonUrl ?? '').trim().slice(0, 512),
    discordInvites: bool(s.discordInvites, d.discordInvites),
    largeImage: oneOf(s.largeImage, LARGE_IMAGE, d.largeImage),
    largeText: oneOf(s.largeText, LARGE_TEXT, d.largeText),
    smallImage: oneOf(s.smallImage, SMALL_IMAGE, d.smallImage),
    smallText: oneOf(s.smallText, SMALL_TEXT, d.smallText),
    autolockEnabled: bool(s.autolockEnabled, d.autolockEnabled),
    autolockAgent: typeof s.autolockAgent === 'string' ? s.autolockAgent : d.autolockAgent
  }
}

export function setAutostart(enabled: boolean): void {
  try {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      path: executablePath(),
      args: []
    })
  } catch (e) {
    console.warn('[settings] autostart error:', e)
  }
}
