import { useEffect, useState } from 'react'
import type { Snapshot } from '@shared/types'

export const STATUS_COLOR: Record<string, string> = {
  idle: '#5f6875',
  menus: '#3ecf8e',
  found: '#3ecf8e',
  queue: '#f5b042',
  pregame: '#f5b042',
  ingame: 'var(--accent)',
  range: '#3fa7d6'
}

const LABEL: Record<string, string> = {
  menus: 'status_menu',
  pregame: 'status_pregame',
  ingame: 'status_ingame'
}

export interface StatusView {
  key: string
  label: string
  color: string
  active: boolean
}

export function statusView(snap: Snapshot | null, t: (k: string) => string): StatusView {
  const active = !!snap && snap.connection.valorant && snap.state.sessionState !== 'idle'
  const view = (key: string, label: string): StatusView => ({
    key,
    label: t(label),
    color: STATUS_COLOR[key] ?? STATUS_COLOR.menus,
    active
  })
  if (!snap || !active) return view('idle', 'status_idle')
  const { display, state } = snap
  if (display.isMatchFound) return view('found', 'match_found')
  if (display.isQueuing) return view('queue', display.isRange ? 'queuing_range' : 'queuing')
  if (display.isRange) return view('range', 'status_range')
  return view(state.sessionState, LABEL[state.sessionState] ?? 'status_menu')
}

export function useNow(enabled: boolean, interval = 1000): number {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => setNow(Date.now()), interval)
    return () => clearInterval(id)
  }, [enabled, interval])
  return now
}
