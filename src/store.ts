import { create } from 'zustand'
import type { Settings, Snapshot } from '@shared/types'

interface AppStore {
  settings: Settings | null
  snapshot: Snapshot | null
  ready: boolean
  setSettings: (s: Settings) => void
  setSnapshot: (s: Snapshot) => void
  patch: (patch: Partial<Settings>) => Promise<void>
}

export const useStore = create<AppStore>((set) => ({
  settings: null,
  snapshot: null,
  ready: false,
  setSettings: (s) => set({ settings: s }),
  setSnapshot: (s) => set({ snapshot: s }),
  patch: async (patch) => {
    const next = await window.api.setSettings(patch)
    set({ settings: next })
  }
}))

let initialized = false


export async function initStore(): Promise<void> {
  if (initialized) return
  initialized = true
  const [settings, snapshot] = await Promise.all([
    window.api.getSettings(),
    window.api.getState()
  ])
  useStore.setState({ settings, snapshot, ready: true })
  window.api.onSettingsChanged((s) => useStore.getState().setSettings(s))
  window.api.onStateChanged((s) => useStore.getState().setSnapshot(s))
}
