import { app, BrowserWindow } from 'electron'
import pkg from 'electron-updater'
import type { UpdateInfo } from '@shared/types'
import { IPC } from '@shared/ipc'

const { autoUpdater } = pkg

let state: UpdateInfo = {
  available: false,
  currentVersion: app.getVersion(),
  latestVersion: app.getVersion(),
  downloading: false,
  progress: 0,
  bytesPerSecond: 0,
  downloaded: false,
  error: null
}

function broadcast(): void {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send(IPC.updateState, state)
  }
}

function set(p: Partial<UpdateInfo>): void {
  state = { ...state, ...p }
  broadcast()
}

export function initUpdater(): void {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) =>
    set({ available: true, latestVersion: info.version, error: null })
  )
  autoUpdater.on('update-not-available', (info) =>
    set({ available: false, latestVersion: info.version, error: null })
  )
  autoUpdater.on('download-progress', (p) =>
    set({ downloading: true, progress: p.percent / 100, bytesPerSecond: p.bytesPerSecond })
  )
  autoUpdater.on('update-downloaded', () =>
    set({ downloading: false, downloaded: true, progress: 1 })
  )
  autoUpdater.on('error', (e) =>
    set({ downloading: false, error: String(e?.message ?? e) })
  )
}

export function getUpdateState(): UpdateInfo {
  return state
}

export async function checkForUpdates(): Promise<UpdateInfo> {
  if (!app.isPackaged) {
    set({ available: false, error: null })
    return state
  }
  try {
    set({ error: null })
    await autoUpdater.checkForUpdates()
  } catch (e) {
    set({ error: String(e) })
  }
  return state
}

export function downloadUpdate(): void {
  if (!app.isPackaged || state.downloading) return
  set({ downloading: true, error: null })
  autoUpdater.downloadUpdate().catch((e) => set({ downloading: false, error: String(e) }))
}

export function quitAndInstall(): void {
  if (!app.isPackaged) return
  autoUpdater.quitAndInstall(true, true)
}

export function maybeAutoCheck(enabled: boolean): void {
  if (enabled && app.isPackaged) {
    setTimeout(() => void checkForUpdates(), 4000)
  }
}
