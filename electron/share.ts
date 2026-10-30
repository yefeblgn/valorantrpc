import { writeFileSync } from 'fs'
import { join } from 'path'
import { BrowserWindow, clipboard, dialog, ipcMain, type NativeImage } from 'electron'
import type { ShareAction } from '@shared/types'
import { IPC } from '@shared/ipc'

const WIDTH = 1200
const HEIGHT = 675
const TIMEOUT = 20_000
const IDLE_MS = 120_000

interface Job {
  token: number
  resolve: (image: NativeImage | null) => void
}

function delay<T>(ms: number, value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

export class ShareRenderer {
  private win: BrowserWindow | null = null
  private booted: Promise<boolean> | null = null
  private boot: ((ok: boolean) => void) | null = null
  private job: Job | null = null
  private token = 0
  private idle: ReturnType<typeof setTimeout> | null = null

  constructor(
    private readonly load: (win: BrowserWindow, view: string) => void,
    private readonly zoom: () => number,
    private readonly parent: () => BrowserWindow | null
  ) {
    ipcMain.on(IPC.shareReady, (e, token: unknown, ok: unknown) => {
      const win = this.win
      if (!win || win.isDestroyed() || e.sender !== win.webContents) return
      if (token === null) {
        this.boot?.(true)
        return
      }
      const job = this.job
      if (!job || token !== job.token) return
      if (ok === false) return job.resolve(null)
      win.webContents
        .capturePage(undefined, { stayHidden: true })
        .then((image) => job.resolve(image))
        .catch(() => job.resolve(null))
    })
  }

  warm(): void {
    void this.ensure()
    this.touch()
  }

  dispose(): void {
    if (this.idle) clearTimeout(this.idle)
    this.idle = null
    const win = this.win
    this.win = null
    this.booted = null
    this.boot?.(false)
    this.boot = null
    this.job?.resolve(null)
    if (win && !win.isDestroyed()) win.destroy()
  }

  async render(matchId: string, action: ShareAction, puuid: string): Promise<boolean> {
    if (this.job) return false
    this.touch()
    const ready = await Promise.race([this.ensure(), delay(TIMEOUT, false)])
    const win = this.win
    if (!ready || !win || win.isDestroyed()) {
      this.dispose()
      return false
    }

    const z = this.zoom()
    win.setContentSize(Math.round(WIDTH * z), Math.round(HEIGHT * z))
    win.webContents.setZoomFactor(z)
    const token = ++this.token
    let timer: ReturnType<typeof setTimeout> | null = null
    const image = await new Promise<NativeImage | null>((resolve) => {
      this.job = { token, resolve }
      timer = setTimeout(() => resolve(null), TIMEOUT)
      win.webContents.send(IPC.shareRequest, { token, puuid, id: matchId })
    })
    if (timer) clearTimeout(timer)
    this.job = null
    this.touch()
    if (!image || image.isEmpty()) return false

    if (action === 'copy') {
      clipboard.writeImage(image)
      return true
    }
    const options = {
      defaultPath: `valorantrpc-${matchId.slice(0, 8)}.png`,
      filters: [{ name: 'PNG', extensions: ['png'] }]
    }
    const parent = this.parent()
    const result = parent
      ? await dialog.showSaveDialog(parent, options)
      : await dialog.showSaveDialog(options)
    if (result.canceled || !result.filePath) return false
    writeFileSync(result.filePath, image.toPNG())
    return true
  }

  private touch(): void {
    if (this.idle) clearTimeout(this.idle)
    this.idle = setTimeout(() => {
      if (this.job) this.touch()
      else this.dispose()
    }, IDLE_MS)
  }

  private ensure(): Promise<boolean> {
    if (this.win && !this.win.isDestroyed() && this.booted) return this.booted
    const z = this.zoom()
    const win = new BrowserWindow({
      show: false,
      width: Math.round(WIDTH * z),
      height: Math.round(HEIGHT * z),
      useContentSize: true,
      frame: false,
      resizable: false,
      skipTaskbar: true,
      paintWhenInitiallyHidden: true,
      backgroundColor: '#0b0e13',
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false,
        backgroundThrottling: false
      }
    })
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    this.win = win
    const booted = new Promise<boolean>((resolve) => {
      this.boot = resolve
    })
    this.booted = booted
    win.webContents.on('did-fail-load', (_e, _code, _desc, _url, mainFrame) => {
      if (mainFrame) this.boot?.(false)
    })
    win.webContents.on('render-process-gone', () => {
      if (this.win === win) this.dispose()
    })
    win.on('closed', () => {
      if (this.win === win) this.dispose()
    })
    this.load(win, 'share')
    return booted
  }
}
