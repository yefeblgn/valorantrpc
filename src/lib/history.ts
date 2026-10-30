import { useEffect } from 'react'
import { create } from 'zustand'
import type {
  Catalog,
  CatalogAgent,
  CatalogMap,
  CatalogWeapon,
  HistoryData,
  HistoryStatus,
  MatchSummary
} from '@shared/history'
import { useStore } from '../store'

interface HistoryState {
  status: HistoryStatus | null
  data: HistoryData | null
  catalog: Catalog | null
  account: string
  openMatch: string | null
  setAccount: (puuid: string) => void
  setOpenMatch: (id: string | null) => void
}

export const useHistoryStore = create<HistoryState>((set) => ({
  status: null,
  data: null,
  catalog: null,
  account: '',
  openMatch: null,
  setAccount: (account) => {
    set({ account, openMatch: null })
    void refreshData(account)
  },
  setOpenMatch: (openMatch) => set({ openMatch })
}))

let initialized = false
let refreshTimer: ReturnType<typeof setTimeout> | null = null

async function refreshData(account = useHistoryStore.getState().account): Promise<void> {
  const data = await window.api.getHistory(account || undefined)
  if (useHistoryStore.getState().account === account) useHistoryStore.setState({ data })
}

async function refreshCatalog(): Promise<void> {
  try {
    useHistoryStore.setState({ catalog: await window.api.getCatalog() })
  } catch (e) {
    console.warn('[history] catalog failed:', e)
  }
}

export function initHistory(): void {
  if (initialized) return
  initialized = true
  window.api.onHistoryChanged((status) => {
    const state = useHistoryStore.getState()
    const account = state.account && state.account !== status.puuid ? state.account : ''
    useHistoryStore.setState({ status, account })
    if (refreshTimer) clearTimeout(refreshTimer)
    refreshTimer = setTimeout(() => {
      void refreshData()
      if (!useHistoryStore.getState().catalog || status.total === 0) void refreshCatalog()
    }, 250)
  })
  void window.api.getHistoryStatus().then((status) => useHistoryStore.setState({ status }))
  void refreshData()
  void refreshCatalog()
}

export function useHistory(): HistoryState {
  const language = useStore((s) => s.settings?.language)
  const state = useHistoryStore()
  useEffect(() => {
    initHistory()
  }, [])
  useEffect(() => {
    if (language && state.catalog && state.catalog.language !== language) void refreshCatalog()
  }, [language, state.catalog])
  return state
}

const EMPTY_AGENT: CatalogAgent = {
  name: '',
  icon: null,
  portrait: null,
  role: '',
  abilities: ['', '', '', '']
}

const EMPTY_MAP: CatalogMap = {
  name: '',
  splash: null,
  list: null,
  minimap: null,
  xMul: 0,
  yMul: 0,
  xAdd: 0,
  yAdd: 0
}

export function agentOf(catalog: Catalog | null, uuid: string): CatalogAgent {
  return catalog?.agents[uuid.toLowerCase()] ?? EMPTY_AGENT
}

export function mapOf(catalog: Catalog | null, path: string): CatalogMap {
  return catalog?.maps[path.toLowerCase()] ?? EMPTY_MAP
}

export function weaponOf(catalog: Catalog | null, uuid: string): CatalogWeapon | null {
  return catalog?.weapons[uuid.toLowerCase()] ?? null
}

export function tierOf(
  catalog: Catalog | null,
  tier: number
): { name: string; icon: string | null } {
  return catalog?.tiers[tier] ?? { name: '', icon: null }
}

export function modeOf(
  catalog: Catalog | null,
  match: Pick<MatchSummary, 'queue' | 'custom'>
): { name: string; icon: string | null } {
  const key = match.custom ? 'custom' : match.queue
  return catalog?.modes[key] ?? { name: match.queue, icon: null }
}

export function seasonLabel(catalog: Catalog | null, id: string): string {
  return catalog?.seasons[id]?.label ?? ''
}
