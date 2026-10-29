import { join } from 'path'
import { BrowserWindow, globalShortcut, screen } from 'electron'
import { IPC } from '@shared/ipc'

const FADE_MS = 200

export class Overlay {
  private win: BrowserWindow | null = null
  private visible = false
  private hideTimer: ReturnType<typeof setTimeout> | null = null
  private accelerator = ''
  private registered = false
  private paused = false

  constructor(private readonly load: (win: BrowserWindow, view: string) => void) {}

  isVisible(): boolean {
    return this.visible
  }

  toggle(): void {
    if (this.visible) this.hide()
    else this.show()
  }

  show(): void {
    const win = this.ensure()
    const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
    if (this.hideTimer) clearTimeout(this.hideTimer)
    this.visible = true
    win.setBounds(display.bounds)
    win.setAlwaysOnTop(true, 'screen-saver')
    win.showInactive()
    win.webContents.send(IPC.overlayVisible, true)
  }

  hide(): void {
    const win = this.win
    if (!this.visible || !win || win.isDestroyed()) return
    this.visible = false
    win.webContents.send(IPC.overlayVisible, false)
    this.hideTimer = setTimeout(() => {
      if (!this.visible && !win.isDestroyed()) win.hide()
    }, FADE_MS)
  }

  setHotkey(accelerator: string, enabled: boolean): boolean {
    this.unregister()
    this.accelerator = enabled ? accelerator : ''
    if (!enabled) this.hide()
    return this.register()
  }

  pause(paused: boolean): void {
    this.paused = paused
    if (paused) this.unregister()
    else this.register()
  }

  hotkeyOk(): boolean {
    return !this.accelerator || this.paused || this.registered
  }

  destroy(): void {
    this.unregister()
    if (this.hideTimer) clearTimeout(this.hideTimer)
    if (this.win && !this.win.isDestroyed()) this.win.destroy()
    this.win = null
    this.visible = false
  }

  private register(): boolean {
    if (!this.accelerator || this.paused) return true
    if (this.registered) return true
    try {
      this.registered = globalShortcut.register(this.accelerator, () => this.toggle())
    } catch (e) {
      console.warn('[overlay] hotkey rejected:', e)
      this.registered = false
    }
    return this.registered
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
    this.load(win, 'overlay')
    this.win = win
    return win
  }
}
