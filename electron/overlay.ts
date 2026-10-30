import { join } from 'path'
import { BrowserWindow, globalShortcut, screen, type Rectangle } from 'electron'
import type { OverlayView } from '@shared/types'
import { IPC } from '@shared/ipc'
import type { GameFocus } from './gameWindow'

const FADE_MS = 160

function sameRect(a: Rectangle | null, b: Rectangle | null): boolean {
  return a?.x === b?.x && a?.y === b?.y && a?.width === b?.width && a?.height === b?.height
}

export class Overlay {
  private win: BrowserWindow | null = null
  private ready = false
  private shown = false
  private hideTimer: ReturnType<typeof setTimeout> | null = null
  private accelerator = ''
  private enabled = false
  private registered = false
  private hotkeyValid = true
  private paused = false
  private tracker = false
  private hudWanted = false
  private game: GameFocus = { focused: false, physical: null }
  private view: OverlayView = { tracker: false, hud: false }
  private bounds: Rectangle | null = null
  private interactive = false
  private readonly onDisplays = (): void => this.fit()

  constructor(private readonly load: (win: BrowserWindow, view: string) => void) {
    screen.on('display-metrics-changed', this.onDisplays)
    screen.on('display-added', this.onDisplays)
    screen.on('display-removed', this.onDisplays)
  }

  getView(): OverlayView {
    return this.view
  }

  toggle(): void {
    if (!this.enabled || !this.game.focused) return
    this.tracker = !this.tracker
    this.render()
  }

  setGame(game: GameFocus): void {
    this.game = game
    if (!game.focused) this.tracker = false
    if (game.focused && this.enabled) this.ensure()
    this.syncHotkey()
    this.render()
  }

  setInteractive(interactive: boolean): void {
    const next = interactive && this.view.hud
    if (next === this.interactive) return
    this.interactive = next
    const win = this.win
    if (win && !win.isDestroyed()) win.setIgnoreMouseEvents(!next, { forward: true })
  }

  setHud(wanted: boolean): void {
    this.hudWanted = wanted
    this.render()
  }

  setHotkey(accelerator: string, enabled: boolean): void {
    this.unregister()
    this.accelerator = accelerator
    this.enabled = enabled
    if (!enabled) this.tracker = false
    this.hotkeyValid = this.validate()
    this.syncHotkey()
    this.render()
  }

  pause(paused: boolean): void {
    this.paused = paused
    this.syncHotkey()
  }

  hotkeyOk(): boolean {
    return !this.enabled || this.hotkeyValid
  }

  destroy(): void {
    this.unregister()
    screen.off('display-metrics-changed', this.onDisplays)
    screen.off('display-added', this.onDisplays)
    screen.off('display-removed', this.onDisplays)
    if (this.hideTimer) clearTimeout(this.hideTimer)
    if (this.win && !this.win.isDestroyed()) this.win.destroy()
    this.win = null
    this.ready = false
    this.shown = false
    this.view = { tracker: false, hud: false }
  }

  private render(): void {
    const active = this.enabled && this.game.focused
    const next: OverlayView = {
      tracker: active && this.tracker,
      hud: active && this.hudWanted && !this.tracker
    }
    const changed = next.tracker !== this.view.tracker || next.hud !== this.view.hud
    this.view = next
    if (!next.hud) this.setInteractive(false)
    if (next.tracker || next.hud) this.reveal()
    else this.conceal()
    if (changed && this.win && !this.win.isDestroyed()) {
      this.win.webContents.send(IPC.overlayView, next)
    }
  }

  private reveal(): void {
    const win = this.ensure()
    if (this.hideTimer) {
      clearTimeout(this.hideTimer)
      this.hideTimer = null
    }
    if (!this.ready) return
    this.fit()
    if (this.shown) return
    this.shown = true
    win.showInactive()
    win.setAlwaysOnTop(true, 'screen-saver')
    win.moveTop()
  }

  private conceal(): void {
    if (!this.shown || this.hideTimer) return
    this.hideTimer = setTimeout(() => {
      this.hideTimer = null
      const win = this.win
      if (this.view.tracker || this.view.hud || !win || win.isDestroyed()) return
      win.hide()
      this.shown = false
    }, FADE_MS)
  }

  private targetBounds(): Rectangle {
    if (this.game.physical && process.platform === 'win32') {
      return screen.screenToDipRect(null, this.game.physical)
    }
    return screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).bounds
  }

  private fit(): void {
    const win = this.win
    if (!win || win.isDestroyed() || !this.ready) return
    const bounds = this.targetBounds()
    if (sameRect(bounds, this.bounds)) return
    this.bounds = bounds
    win.setBounds(bounds)
  }

  private validate(): boolean {
    if (!this.enabled || !this.accelerator) return true
    try {
      const ok = globalShortcut.register(this.accelerator, () => this.toggle())
      if (ok) globalShortcut.unregister(this.accelerator)
      return ok
    } catch (e) {
      console.warn('[overlay] hotkey rejected:', e)
      return false
    }
  }

  private syncHotkey(): void {
    const want =
      this.enabled && !!this.accelerator && this.hotkeyValid && !this.paused && this.game.focused
    if (want) this.register()
    else this.unregister()
  }

  private register(): void {
    if (this.registered) return
    try {
      this.registered = globalShortcut.register(this.accelerator, () => this.toggle())
    } catch (e) {
      console.warn('[overlay] hotkey rejected:', e)
      this.registered = false
    }
  }

  private unregister(): void {
    if (this.registered && this.accelerator) {
      try {
        globalShortcut.unregister(this.accelerator)
      } catch (e) {
        console.debug('[overlay] unregister failed:', e)
      }
    }
    this.registered = false
  }

  private ensure(): BrowserWindow {
    if (this.win && !this.win.isDestroyed()) return this.win
    const win = new BrowserWindow({
      show: false,
      frame: false,
      thickFrame: false,
      transparent: true,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      focusable: false,
      skipTaskbar: true,
      hasShadow: false,
      alwaysOnTop: true,
      backgroundColor: '#00000000',
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false,
        backgroundThrottling: false
      }
    })
    win.setIgnoreMouseEvents(true, { forward: true })
    win.setAlwaysOnTop(true, 'screen-saver')
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    win.once('ready-to-show', () => {
      this.ready = true
      this.bounds = null
      this.render()
    })
    win.on('closed', () => {
      if (this.win !== win) return
      this.win = null
      this.ready = false
      this.shown = false
      this.bounds = null
      this.interactive = false
    })
    this.load(win, 'overlay')
    this.win = win
    this.ready = false
    this.shown = false
    this.bounds = null
    this.interactive = false
    return win
  }
}
