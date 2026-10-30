import { contextBridge, ipcRenderer } from 'electron'
import type {
  AgentOption,
  MatchReport,
  NavigateTarget,
  OverlayView,
  Settings,
  ShareAction,
  TransferResult,
  Snapshot,
  UpdateInfo,
  WindowInfo
} from '@shared/types'
import type { Catalog, HistoryData, HistoryStatus, MatchDetail } from '@shared/history'
import { IPC } from '@shared/ipc'

type Unsubscribe = () => void

function subscribe<T>(channel: string, cb: (payload: T) => void): Unsubscribe {
  const listener = (_e: unknown, payload: T): void => cb(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const api = {
  minimize: (): void => ipcRenderer.send(IPC.windowMinimize),
  close: (): void => ipcRenderer.send(IPC.windowClose),
  quit: (): void => ipcRenderer.send(IPC.appQuit),
  getVersion: (): Promise<string> => ipcRenderer.invoke(IPC.appGetVersion),
  openExternal: (url: string): void => ipcRenderer.send(IPC.shellOpenExternal, url),

  getSettings: (): Promise<Settings> => ipcRenderer.invoke(IPC.settingsGet),
  setSettings: (patch: Partial<Settings>): Promise<Settings> =>
    ipcRenderer.invoke(IPC.settingsSet, patch),
  onSettingsChanged: (cb: (s: Settings) => void): Unsubscribe => subscribe(IPC.settingsChanged, cb),

  getState: (): Promise<Snapshot> => ipcRenderer.invoke(IPC.stateGet),
  onStateChanged: (cb: (s: Snapshot) => void): Unsubscribe => subscribe(IPC.stateChanged, cb),

  getAgents: (): Promise<AgentOption[]> => ipcRenderer.invoke(IPC.agentsList),
  respondInvite: (userId: string, accept: boolean): void =>
    ipcRenderer.send(IPC.inviteRespond, userId, accept),

  getUpdateState: (): Promise<UpdateInfo> => ipcRenderer.invoke(IPC.updateGet),
  checkUpdate: (): Promise<UpdateInfo> => ipcRenderer.invoke(IPC.updateCheck),
  startUpdate: (): void => ipcRenderer.send(IPC.updateStart),
  onUpdateState: (cb: (u: UpdateInfo) => void): Unsubscribe => subscribe(IPC.updateState, cb),

  getMatch: (): Promise<MatchReport | null> => ipcRenderer.invoke(IPC.matchGet),
  onMatchChanged: (cb: (r: MatchReport | null) => void): Unsubscribe =>
    subscribe(IPC.matchChanged, cb),
  getOverlayView: (): Promise<OverlayView> => ipcRenderer.invoke(IPC.overlayGetView),
  onOverlayView: (cb: (view: OverlayView) => void): Unsubscribe => subscribe(IPC.overlayView, cb),
  pauseHotkey: (paused: boolean): void => ipcRenderer.send(IPC.hotkeyPause, paused),
  getHotkeyStatus: (): Promise<boolean> => ipcRenderer.invoke(IPC.hotkeyStatus),
  getWindowInfo: (): Promise<WindowInfo> => ipcRenderer.invoke(IPC.windowInfo),
  setOverlayInteractive: (interactive: boolean): void =>
    ipcRenderer.send(IPC.overlayInteractive, interactive),
  dismissHud: (): void => ipcRenderer.send(IPC.overlayDismiss),
  copyText: (text: string): void => ipcRenderer.send(IPC.clipboardWrite, text),

  getHistoryStatus: (): Promise<HistoryStatus> => ipcRenderer.invoke(IPC.historyStatus),
  getHistory: (puuid?: string): Promise<HistoryData> => ipcRenderer.invoke(IPC.historyData, puuid),
  getMatchDetail: (id: string, puuid?: string): Promise<MatchDetail | null> =>
    ipcRenderer.invoke(IPC.historyDetail, id, puuid),
  onHistoryChanged: (cb: (s: HistoryStatus) => void): Unsubscribe =>
    subscribe(IPC.historyChanged, cb),
  syncHistory: (): void => ipcRenderer.send(IPC.historySync),
  loadOlderHistory: (): void => ipcRenderer.send(IPC.historyBackfill),
  exportHistory: (): Promise<TransferResult> => ipcRenderer.invoke(IPC.historyExport),
  importHistory: (): Promise<TransferResult> => ipcRenderer.invoke(IPC.historyImport),
  getCatalog: (): Promise<Catalog> => ipcRenderer.invoke(IPC.catalogGet),

  shareMatch: (id: string, action: ShareAction, puuid?: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC.shareImage, id, action, puuid),
  shareReady: (): void => ipcRenderer.send(IPC.shareReady),
  onNavigate: (cb: () => void): Unsubscribe => subscribe(IPC.navigate, cb),
  takeNavigate: (): Promise<NavigateTarget | null> => ipcRenderer.invoke(IPC.takeNavigate)
}

export type AppApi = typeof api

contextBridge.exposeInMainWorld('api', api)
