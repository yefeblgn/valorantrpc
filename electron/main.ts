import { execFile } from 'child_process'
import { join } from 'path'
import { app, BrowserWindow, globalShortcut, ipcMain, shell } from 'electron'
import type { MatchReport, PlayerInfo, Settings, Snapshot } from '@shared/types'
import { IPC } from '@shared/ipc'
import { t } from '@shared/i18n'
import { APP_ID, APP_TITLE, DISCORD_CLIENT_ID, assetPath, executablePath } from './constants'
import { loadSettings, setAutostart, updateSettings } from './settings'
import { Poller, type Notice } from './core/poller'
import { AppTray } from './tray'
import { Overlay } from './overlay'
import { GameWatcher, type GameFocus } from './gameWindow'
import { applySize, resolveSize, themeBackground, windowInfo } from './windowSize'
import {
  checkForUpdates,
  getUpdateState,
  initUpdater,
  maybeAutoCheck,
  startUpdate
} from './core/updater'

const isDev = !!process.env['ELECTRON_RENDERER_URL']

let mainWindow: BrowserWindow | null = null
let tray: AppTray | null = null
let overlay: Overlay | null = null
let isQuitting = false
let trayHideNotified = false
let valorantRunning = false
let fallbackFocus: boolean | null = null

const game = new GameWatcher()
game.on('change', (focus: GameFocus) => overlay?.setGame(focus))
game.on('unavailable', () => syncGame())

process.on('uncaughtException', (e) => console.error('[uncaught]', e))
process.on('unhandledRejection', (e) => console.error('[unhandled]', e))

if (process.platform === 'win32') app.setAppUserModelId(APP_ID)

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
  if (next.overlayEnabled !== prev.overlayEnabled || next.overlayHotkey !== prev.overlayHotkey) {
    overlay?.setHotkey(next.overlayHotkey, next.overlayEnabled)
    syncGame()
  }
  if (next.hudEnabled !== prev.hudEnabled) syncHud(poller.match.getReport())
  if (next.windowSize !== prev.windowSize && mainWindow && !mainWindow.isDestroyed()) {
    applySize(mainWindow, next.windowSize)
  }
  if (next.uiScale !== prev.uiScale) {
    for (const win of BrowserWindow.getAllWindows()) applyZoom(win)
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
  if (snap.connection.valorant !== valorantRunning) {
    valorantRunning = snap.connection.valorant
    syncGame()
  }
})

poller.on('match', (report: MatchReport | null) => {
  broadcast(IPC.matchChanged, report)
  syncHud(report)
})

function syncGame(): void {
  if (!overlay) return
  const wanted = loadSettings().overlayEnabled && valorantRunning
  if (game.available) {
    fallbackFocus = null
    if (wanted) game.start()
    else game.stop()
    return
  }
  if (fallbackFocus === wanted) return
  fallbackFocus = wanted
  overlay.setGame({ focused: wanted, physical: null })
}

function syncHud(report: MatchReport | null): void {
  overlay?.setHud(loadSettings().hudEnabled && report?.phase === 'pregame')
}

poller.on('notice', (notice: Notice) => {
  const lang = loadSettings().language
  const message = t(lang, notice.key).replace('{name}', notice.name ?? '')
  tray?.notify(message, t(lang, 'join_notice_title'))
})

poller.on('detected', (player: PlayerInfo) => {
  const settings = loadSettings()
  if (!settings.notifyOnDetect) return
  const lang = settings.language
  const who = player.name ? `${player.name}#${player.tag}` : ''
  const lines = [who ? t(lang, 'detect_desc').replace('{name}', who) : t(lang, 'detect_desc_anon')]
  if (settings.rpcEnabled && poller.discord.connected) lines.push(t(lang, 'detect_rpc'))
  tray?.notify(lines.join(' '), t(lang, 'detect_title'))
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
  const settings = loadSettings()
  const [width, height] = resolveSize(settings.windowSize)
  mainWindow = new BrowserWindow({
    width,
    height,
    useContentSize: true,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    show: false,
    frame: false,
    backgroundColor: themeBackground(settings),
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
    if (url.startsWith('http')) void shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (url !== mainWindow?.webContents.getURL()) e.preventDefault()
  })

  mainWindow.on('closed', () => overlay?.destroy())

  loadRenderer(mainWindow)
}

function applyZoom(win: BrowserWindow): void {
  if (!win.isDestroyed()) win.webContents.setZoomFactor(loadSettings().uiScale / 100)
}

function loadRenderer(win: BrowserWindow, view = ''): void {
  win.webContents.on('did-finish-load', () => applyZoom(win))
  if (isDev) {
    const base = process.env['ELECTRON_RENDERER_URL'] as string
    void win.loadURL(view ? `${base}#${view}` : base)
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'), view ? { hash: view } : undefined)
  }
}

function registerIpc(): void {
  ipcMain.on(IPC.windowMinimize, () => mainWindow?.minimize())
  ipcMain.on(IPC.windowClose, () => mainWindow?.close())
  ipcMain.on(IPC.appQuit, () => quitApp())
  ipcMain.handle(IPC.appGetVersion, () => app.getVersion())
  ipcMain.on(IPC.shellOpenExternal, (_e, url: unknown) => {
    if (typeof url === 'string' && /^https?:\/\//.test(url)) void shell.openExternal(url)
  })

  ipcMain.handle(IPC.settingsGet, () => loadSettings())
  ipcMain.handle(IPC.settingsSet, (_e, patch: Partial<Settings>) => applyPatch(patch ?? {}))

  ipcMain.handle(IPC.stateGet, () => poller.getSnapshot())
  ipcMain.handle(IPC.agentsList, () => poller.getAgents())
  ipcMain.on(IPC.inviteRespond, (_e, userId: unknown, accept: unknown) => {
    if (typeof userId === 'string') poller.respondJoin(userId, accept === true)
  })

  ipcMain.handle(IPC.matchGet, () => poller.match.getReport())
  ipcMain.handle(IPC.overlayGetView, () => overlay?.getView() ?? { tracker: false, hud: false })
  ipcMain.on(IPC.hotkeyPause, (_e, paused: unknown) => overlay?.pause(paused === true))
  ipcMain.handle(IPC.hotkeyStatus, () => overlay?.hotkeyOk() ?? true)
  ipcMain.handle(IPC.windowInfo, () => windowInfo(mainWindow))

  ipcMain.handle(IPC.updateGet, () => getUpdateState())
  ipcMain.handle(IPC.updateCheck, () => checkForUpdates())
  ipcMain.on(IPC.updateStart, () => {
    if (getUpdateState().downloaded) isQuitting = true
    startUpdate()
  })
}

function registerDiscordProtocol(): void {
  if (!app.isPackaged) return
  try {
    app.setAsDefaultProtocolClient(`discord-${DISCORD_CLIENT_ID}`, executablePath(), [])
  } catch (e) {
    console.warn('[main] protocol registration failed:', e)
  }
}

function registerToastIdentity(): void {
  if (process.platform !== 'win32' || !app.isPackaged) return
  const key = `HKCU\\Software\\Classes\\AppUserModelId\\${APP_ID}`
  const values: [string, string][] = [
    ['DisplayName', APP_TITLE],
    ['IconUri', assetPath('game_icon.png')]
  ]
  for (const [name, data] of values) {
    execFile(
      'reg',
      ['add', key, '/v', name, '/t', 'REG_SZ', '/d', data, '/f'],
      { windowsHide: true },
      (e) => {
        if (e) console.warn('[main] toast identity failed:', e.message)
      }
    )
  }
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
    registerToastIdentity()
    registerDiscordProtocol()
    poller.start()

    const settings = loadSettings()
    overlay = new Overlay(loadRenderer)
    overlay.setHotkey(settings.overlayHotkey, settings.overlayEnabled)
    syncGame()
    maybeAutoCheck(settings.autoCheckUpdates)
    setAutostart(settings.autostart)
    if (settings.startMinimized) {
      tray.notify(
        t(settings.language, 'notification_desc'),
        t(settings.language, 'notification_title')
      )
    }

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
    game.stop()
    overlay?.destroy()
    globalShortcut.unregisterAll()
    tray?.destroy()
  })
}
