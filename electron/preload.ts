import { contextBridge, ipcRenderer } from 'electron'
import type {
  AgentOption,
  Settings,
  Snapshot,
  UpdateInfo
} from '@shared/types'
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
  onSettingsChanged: (cb: (s: Settings) => void): Unsubscribe =>
    subscribe(IPC.settingsChanged, cb),

  
  getState: (): Promise<Snapshot> => ipcRenderer.invoke(IPC.stateGet),
  onStateChanged: (cb: (s: Snapshot) => void): Unsubscribe =>
    subscribe(IPC.stateChanged, cb),

  
  getAgents: (): Promise<AgentOption[]> => ipcRenderer.invoke(IPC.agentsList),

  
  checkUpdate: (): Promise<UpdateInfo> => ipcRenderer.invoke(IPC.updateCheck),
  startUpdate: (): void => ipcRenderer.send(IPC.updateStart),
  onUpdateState: (cb: (u: UpdateInfo) => void): Unsubscribe =>
    subscribe(IPC.updateState, cb)
}

export type AppApi = typeof api

contextBridge.exposeInMainWorld('api', api)
