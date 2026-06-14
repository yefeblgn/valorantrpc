import { join } from 'path'
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import type { Settings, Snapshot } from '@shared/types'
import { IPC } from '@shared/ipc'
import { t } from '@shared/i18n'
import { assetPath } from './constants'
import { loadSettings, setAutostart, updateSettings } from './settings'
import { Poller } from './core/poller'
import { AppTray } from './tray'
import {
  checkForUpdates,
  downloadUpdate,
  getUpdateState,
  initUpdater,
  maybeAutoCheck,
  quitAndInstall
} from './core/updater'

const isDev = !!process.env['ELECTRON_RENDERER_URL']

let mainWindow: BrowserWindow | null = null
let tray: AppTray | null = null
let isQuitting = false
let trayHideNotified = false


process.on('uncaughtException', (e) => console.error('[uncaught]', e))
process.on('unhandledRejection', (e) => console.error('[unhandled]', e))


if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => showWindow())
  bootstrap()
}

function broadcast(channel: string, payload: unknown): void {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send(channel, payload)
  }
}


function applyPatch(patch: Partial<Settings>): Settings {
  const prev = loadSettings()
  const next = updateSettings(patch)
  if (patch.language !== undefined && patch.language !== prev.language) {
    poller.setLanguage(next.language)
  }
  if (patch.autostart !== undefined && patch.autostart !== prev.autostart) {
    setAutostart(next.autostart)
  }
  poller.forceRefresh()
  tray?.rebuildMenu()
  broadcast(IPC.settingsChanged, next)
  return next
}

const poller = new Poller(() => loadSettings(), applyPatch)

poller.on('snapshot', (snap: Snapshot) => {
  broadcast(IPC.stateChanged, snap)
  tray?.update(snap.connection.valorant, statusText(snap))
})

function statusText(snap: Snapshot): string {
  const lang = loadSettings().language
  if (!snap.connection.valorant) return t(lang, 'status_idle')
  const map: Record<string, string> = {
    menus: 'status_menu',
    pregame: 'status_pregame',
    ingame: 'status_ingame'
  }
  return t(lang, map[snap.state.sessionState] ?? 'status_menu')
}

function showWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow()
    return
  }
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 900,
    minHeight: 620,
    show: false,
    frame: false,
    backgroundColor: '#0b0d13',
    autoHideMenuBar: true,
    icon: assetPath('game_icon_white.ico'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    if (!loadSettings().startMinimized) mainWindow?.show()
  })

  
  mainWindow.on('close', (e) => {
    if (!isQuitting && loadSettings().closeToTray) {
      e.preventDefault()
      mainWindow?.hide()
      if (!trayHideNotified) {
        trayHideNotified = true
        const lang = loadSettings().language
        tray?.notify(t(lang, 'tray_hide_desc'), t(lang, 'tray_hide_title'))
      }
    }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] as string)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}


function registerIpc(): void {
  ipcMain.on(IPC.windowMinimize, () => mainWindow?.minimize())
  ipcMain.on(IPC.windowClose, () => mainWindow?.close())
  ipcMain.on(IPC.windowHide, () => mainWindow?.hide())
  ipcMain.on(IPC.appQuit, () => quitApp())
  ipcMain.handle(IPC.appGetVersion, () => app.getVersion())
  ipcMain.on(IPC.shellOpenExternal, (_e, url: string) => {
    if (typeof url === 'string' && url.startsWith('http')) shell.openExternal(url)
  })

  ipcMain.handle(IPC.settingsGet, () => loadSettings())
  ipcMain.handle(IPC.settingsSet, (_e, patch: Partial<Settings>) => applyPatch(patch ?? {}))

  ipcMain.handle(IPC.stateGet, () => poller.getSnapshot())
  ipcMain.handle(IPC.agentsList, () => poller.getAgents())

  
  ipcMain.handle(IPC.updateCheck, () => checkForUpdates())
  ipcMain.on(IPC.updateStart, () => {
    if (getUpdateState().downloaded) {
      isQuitting = true
      quitAndInstall()
    } else {
      downloadUpdate()
    }
  })
}

function quitApp(): void {
  isQuitting = true
  app.quit()
}

function bootstrap(): void {
  app.whenReady().then(() => {
    registerIpc()
    createWindow()

    tray = new AppTray({
      showWindow,
      getSettings: () => loadSettings(),
      applyPatch,
      quit: quitApp
    })

    initUpdater()
    poller.start()
    maybeAutoCheck(loadSettings().autoCheckUpdates)

    const lang = loadSettings().language
    tray.notify(t(lang, 'notification_desc'), t(lang, 'notification_title'))

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
      else showWindow()
    })
  })

  app.on('window-all-closed', () => {
    
    if (process.platform !== 'darwin' && !loadSettings().closeToTray) app.quit()
  })

  app.on('before-quit', () => {
    isQuitting = true
    void poller.stop()
    tray?.destroy()
  })
}
