import { execFile } from 'child_process'
import { join } from 'path'
import { app, BrowserWindow, clipboard, dialog, globalShortcut, ipcMain, shell } from 'electron'
import type {
  MatchReport,
  NavigateTarget,
  PlayerInfo,
  Settings,
  ShareAction,
  Snapshot,
  TransferResult
} from '@shared/types'
import { acs, lossStreak, type MatchSummary } from '@shared/history'
import { IPC } from '@shared/ipc'
import { t } from '@shared/i18n'
import { APP_ID, APP_TITLE, DISCORD_CLIENT_ID, assetPath, executablePath } from './constants'
import { loadSettings, setAutostart, updateSettings } from './settings'
import { Poller, type Notice } from './core/poller'
import { AppTray } from './tray'
import { Overlay } from './overlay'
import { GameWatcher, type GameFocus } from './gameWindow'
import { ShareRenderer } from './share'
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
let pendingNav: NavigateTarget | null = null
let dismissedMatch = ''
const MAX_CLIPBOARD = 200

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
  overlay?.setHud(
    loadSettings().hudEnabled && report?.phase === 'pregame' && report.matchId !== dismissedMatch
  )
}

poller.history.on('changed', () => broadcast(IPC.historyChanged, poller.history.status()))
poller.history.on('newMatches', (list: MatchSummary[]) => onNewMatches(list))

function onNewMatches(list: MatchSummary[]): void {
  const settings = loadSettings()
  const lang = settings.language
  const latest = list[0]
  if (settings.postMatchNotify && latest) {
    const map = poller.content.mapInfo(latest.map)[0]
    const agent = poller.content.agentName(latest.agent)
    const score = `${latest.ally}-${latest.enemy}`
    const title = [t(lang, `result_${latest.result}`), score, map].filter(Boolean).join(' · ')
    const parts = [
      agent,
      `${latest.kills}/${latest.deaths}/${latest.assists}`,
      `${t(lang, 'acs')} ${acs(latest)}`
    ]
    if (latest.rr && !settings.streamerMode) {
      parts.push(`${latest.rr.change > 0 ? '+' : ''}${latest.rr.change} RR`)
    }
    if (latest.mvp) parts.push(t(lang, latest.mvp === 'match' ? 'mvp_match' : 'mvp_team'))
    if (latest.multi[2] > 0) parts.push(t(lang, 'ace'))
    tray?.notify(parts.filter(Boolean).join(' · '), title, () =>
      navigate({ page: 'career', matchId: latest.id })
    )
  }
  if (settings.tiltEnabled) {
    const fresh = new Set(list.map((m) => m.id))
    const all = poller.history.store.state.matches.filter((m) => !m.custom)
    const streak = lossStreak(all)
    const before = lossStreak(all.filter((m) => !fresh.has(m.id)))
    if (streak >= settings.tiltThreshold && before < settings.tiltThreshold) {
      tray?.notify(t(lang, 'tilt_desc').replace('{n}', String(streak)), t(lang, 'tilt_title'))
    }
  }
}

function navigate(target: NavigateTarget): void {
  pendingNav = target
  showWindow()
  mainWindow?.webContents.send(IPC.navigate)
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

const share = new ShareRenderer(
  loadRenderer,
  () => loadSettings().uiScale / 100,
  () => (mainWindow && !mainWindow.isDestroyed() ? mainWindow : null)
)

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

  ipcMain.on(IPC.overlayInteractive, (_e, interactive: unknown) =>
    overlay?.setInteractive(interactive === true)
  )
  ipcMain.on(IPC.overlayDismiss, () => {
    dismissedMatch = poller.match.getReport()?.matchId ?? ''
    syncHud(poller.match.getReport())
  })
  ipcMain.on(IPC.clipboardWrite, (_e, text: unknown) => {
    if (typeof text === 'string' && text.length <= MAX_CLIPBOARD) clipboard.writeText(text)
  })
  ipcMain.handle(IPC.takeNavigate, () => {
    const target = pendingNav
    pendingNav = null
    return target
  })

  const optional = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined)
  ipcMain.handle(IPC.historyStatus, () => poller.history.status())
  ipcMain.handle(IPC.historyData, (_e, puuid: unknown) => poller.history.data(optional(puuid)))
  ipcMain.handle(IPC.historyDetail, (_e, id: unknown, puuid: unknown) =>
    typeof id === 'string' ? poller.history.detail(id, optional(puuid)) : null
  )
  ipcMain.on(IPC.historySync, () => {
    poller.history.requestSync()
    poller.forceRefresh()
  })
  ipcMain.on(IPC.historyBackfill, () => {
    poller.history.requestBackfill()
    poller.forceRefresh()
  })
  ipcMain.handle(IPC.historyExport, () => transfer('export'))
  ipcMain.handle(IPC.historyImport, () => transfer('import'))
  ipcMain.handle(IPC.catalogGet, () => poller.content.catalog(poller.history.queues()))
  ipcMain.handle(IPC.shareImage, (_e, id: unknown, action: unknown, puuid: unknown) => {
    if (typeof id !== 'string') return false
    const mode: ShareAction = action === 'save' ? 'save' : 'copy'
    return share.render(id, mode, optional(puuid) ?? poller.history.puuid)
  })

  ipcMain.handle(IPC.updateGet, () => getUpdateState())
  ipcMain.handle(IPC.updateCheck, () => checkForUpdates())
  ipcMain.on(IPC.updateStart, () => {
    if (getUpdateState().downloaded) isQuitting = true
    startUpdate()
  })
}

async function transfer(kind: 'export' | 'import'): Promise<TransferResult> {
  const filters = [{ name: 'ValorantRPC', extensions: ['vrpc'] }]
  const parent = mainWindow && !mainWindow.isDestroyed() ? mainWindow : null
  try {
    if (kind === 'export') {
      const date = new Date().toISOString().slice(0, 10)
      const options = { defaultPath: `valorantrpc-history-${date}.vrpc`, filters }
      const r = parent
        ? await dialog.showSaveDialog(parent, options)
        : await dialog.showSaveDialog(options)
      if (r.canceled || !r.filePath) return { ok: false, count: 0 }
      return { ok: true, count: poller.history.exportTo(r.filePath) }
    }
    const options = { filters, properties: ['openFile' as const] }
    const r = parent
      ? await dialog.showOpenDialog(parent, options)
      : await dialog.showOpenDialog(options)
    const path = r.filePaths[0]
    if (r.canceled || !path) return { ok: false, count: 0 }
    return { ok: true, count: poller.history.importFrom(path) }
  } catch (e) {
    console.warn(`[main] history ${kind} failed:`, e)
    return { ok: false, count: 0, error: e instanceof Error ? e.message : String(e) }
  }
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
