import { join } from 'path'
import { BrowserWindow, globalShortcut, screen, type Rectangle } from 'electron'
import type { OverlayRegion, OverlayView } from '@shared/types'
import { IPC } from '@shared/ipc'
import type { GameFocus } from './gameWindow'

const FADE_MS = 240
const HIT_POLL_MS = 40
const HIT_MARGIN = 6

export interface OverlayNative {
  attach: (handle: string) => void
  returnFocus: () => void
}

function sameRect(a: Rectangle | null, b: Rectangle | null): boolean {
  return a?.x === b?.x && a?.y === b?.y && a?.width === b?.width && a?.height === b?.height
}

function handleOf(win: BrowserWindow): string {
  const buf = win.getNativeWindowHandle()
  return (buf.length >= 8 ? buf.readBigUInt64LE(0) : BigInt(buf.readUInt32LE(0))).toString()
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
  private passThrough = true
  private focusMode = false
  private region: OverlayRegion | null = null
  private hold = false
  private hitTimer: ReturnType<typeof setInterval> | null = null
  private readonly onDisplays = (): void => this.fit()

  constructor(
    private readonly load: (win: BrowserWindow, view: string) => void,
    private readonly native: OverlayNative
  ) {
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

  close(): void {
    if (!this.tracker) return
    this.tracker = false
    this.render()
  }

  setGame(game: GameFocus): void {
    this.game = game
    if (!game.focused) this.tracker = false
    if (game.focused && this.enabled) this.ensure()
    this.syncHotkey()
    this.render()
  }

  setRegion(region: OverlayRegion | null, hold: boolean): void {
    this.region = region
    this.hold = hold && !!region
    this.syncInput()
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
    this.stopHitTest()
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
    if (next.tracker || next.hud) this.reveal()
    else this.conceal()
    this.syncInput()
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
    if (!this.shown) {
      this.shown = true
      if (this.view.tracker) {
        this.focusMode = true
        win.setFocusable(true)
        win.setSkipTaskbar(true)
        this.setPassThrough(false)
        win.show()
      } else {
        win.showInactive()
      }
    }
    win.setAlwaysOnTop(true, 'screen-saver')
    win.moveTop()
    if (this.focusMode && this.view.tracker && !win.isFocused()) win.focus()
  }

  private conceal(): void {
    const win = this.win
    if (!this.shown || !win || win.isDestroyed()) return
    if (this.focusMode && win.isFocused()) this.native.returnFocus()
    if (this.hideTimer) return
    this.hideTimer = setTimeout(() => {
      this.hideTimer = null
      if (this.view.tracker || this.view.hud || win.isDestroyed()) return
      win.hide()
      this.shown = false
      if (this.focusMode) {
        this.focusMode = false
        win.setFocusable(false)
        win.setSkipTaskbar(true)
      }
    }, FADE_MS)
  }

  private syncInput(): void {
    const win = this.win
    if (!win || win.isDestroyed()) return
    const hitTest = this.shown && this.view.hud && !this.view.tracker && !!this.region
    if (hitTest) {
      if (!this.hitTimer) this.hitTimer = setInterval(() => this.hitTest(), HIT_POLL_MS)
      this.hitTest()
      return
    }
    this.stopHitTest()
    this.setPassThrough(!(this.shown && this.view.tracker))
  }

  private hitTest(): void {
    const win = this.win
    const r = this.region
    if (!win || win.isDestroyed() || !r) return
    if (this.hold) {
      this.setPassThrough(false)
      return
    }
    const b = win.getBounds()
    const c = screen.getCursorScreenPoint()
    const x = c.x - b.x
    const y = c.y - b.y
    const inside =
      x >= r.x - HIT_MARGIN &&
      x <= r.x + r.width + HIT_MARGIN &&
      y >= r.y - HIT_MARGIN &&
      y <= r.y + r.height + HIT_MARGIN
    this.setPassThrough(!inside)
  }

  private stopHitTest(): void {
    if (!this.hitTimer) return
    clearInterval(this.hitTimer)
    this.hitTimer = null
  }

  private setPassThrough(pass: boolean): void {
    const win = this.win
    if (pass === this.passThrough || !win || win.isDestroyed()) return
    this.passThrough = pass
    win.setIgnoreMouseEvents(pass)
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

  private reset(): void {
    this.ready = false
    this.shown = false
    this.bounds = null
    this.passThrough = true
    this.focusMode = false
    this.hold = false
    this.stopHitTest()
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
    win.setIgnoreMouseEvents(true)
    win.setAlwaysOnTop(true, 'screen-saver')
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    this.native.attach(handleOf(win))
    win.once('ready-to-show', () => {
      this.ready = true
      this.bounds = null
      this.render()
    })
    win.on('blur', () => {
      if (!this.focusMode || !this.tracker) return
      this.tracker = false
      this.render()
    })
    win.on('closed', () => {
      if (this.win !== win) return
      this.win = null
      this.native.attach('0')
      this.reset()
    })
    this.load(win, 'overlay')
    this.win = win
    this.reset()
    return win
  }
}
