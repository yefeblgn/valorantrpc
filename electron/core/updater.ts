import { app, BrowserWindow, shell } from 'electron'
import pkg from 'electron-updater'
import type { UpdateInfo } from '@shared/types'
import { IPC } from '@shared/ipc'
import { GITHUB_RELEASES_PAGE, isPortable } from '../constants'

const { autoUpdater } = pkg

let state: UpdateInfo = {
  checking: false,
  checkedAt: null,
  portable: isPortable(),
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
  autoUpdater.autoInstallOnAppQuit = !state.portable

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
    set({ checking: false, downloading: false, error: String(e?.message ?? e) })
  )
}

export function getUpdateState(): UpdateInfo {
  return state
}

export async function checkForUpdates(): Promise<UpdateInfo> {
  if (state.checking || state.downloading) return state
  if (!app.isPackaged) {
    set({ available: false, error: null, checkedAt: Date.now() })
    return state
  }
  set({ checking: true, error: null })
  try {
    await autoUpdater.checkForUpdates()
  } catch (e) {
    set({ error: String(e) })
  } finally {
    set({ checking: false, checkedAt: Date.now() })
  }
  return state
}

export function startUpdate(): void {
  if (!app.isPackaged) return
  if (state.portable) {
    void shell.openExternal(GITHUB_RELEASES_PAGE)
    return
  }
  if (state.downloaded) {
    autoUpdater.quitAndInstall(true, true)
    return
  }
  if (state.downloading) return
  set({ downloading: true, error: null })
  autoUpdater.downloadUpdate().catch((e) => set({ downloading: false, error: String(e) }))
}

export function maybeAutoCheck(enabled: boolean): void {
  if (enabled && app.isPackaged) {
    setTimeout(() => void checkForUpdates(), 4000)
  }
}
