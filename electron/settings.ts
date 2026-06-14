import { existsSync, readFileSync, writeFileSync } from 'fs'
import { app } from 'electron'
import { DEFAULT_SETTINGS, type Settings } from '@shared/types'
import { configPath } from './constants'

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

export function saveSettings(s: Settings): void {
  cache = s
  try {
    writeFileSync(configPath(), JSON.stringify(s, null, 2), 'utf-8')
  } catch (e) {
    console.warn('[settings] save error:', e)
  }
}

export function updateSettings(patch: Partial<Settings>): Settings {
  const next = sanitize({ ...loadSettings(), ...patch })
  saveSettings(next)
  return next
}


function sanitize(s: Settings): Settings {
  return {
    ...s,
    pollInterval: Math.min(Math.max(Number(s.pollInterval) || 2, 1), 10),
    language: s.language === 'tr' ? 'tr' : 'en',
    accentColor: /^#[0-9a-fA-F]{6}$/.test(s.accentColor) ? s.accentColor : '#ff4655'
  }
}

export function setAutostart(enabled: boolean): void {
  try {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      path: process.execPath,
      args: []
    })
  } catch (e) {
    console.warn('[settings] autostart error:', e)
  }
}
