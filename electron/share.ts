import { writeFileSync } from 'fs'
import { join } from 'path'
import { BrowserWindow, clipboard, dialog, ipcMain, type NativeImage } from 'electron'
import type { ShareAction } from '@shared/types'
import { IPC } from '@shared/ipc'

const WIDTH = 1200
const HEIGHT = 675
const TIMEOUT = 20_000

interface Pending {
  id: number
  resolve: (image: NativeImage | null) => void
}

export class ShareRenderer {
  private pending: Pending | null = null

  constructor(
    private readonly load: (win: BrowserWindow, view: string) => void,
    private readonly zoom: () => number,
    private readonly parent: () => BrowserWindow | null
  ) {
    ipcMain.on(IPC.shareReady, (e) => {
      const pending = this.pending
      if (!pending || e.sender.id !== pending.id) return
      const win = BrowserWindow.fromWebContents(e.sender)
      if (!win) return pending.resolve(null)
      win.webContents
        .capturePage(undefined, { stayHidden: true })
        .then((image) => pending.resolve(image))
        .catch(() => pending.resolve(null))
    })
  }

  async render(matchId: string, action: ShareAction, puuid: string): Promise<boolean> {
    if (this.pending) return false
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

    let timer: ReturnType<typeof setTimeout> | null = null
    const image = await new Promise<NativeImage | null>((resolve) => {
      this.pending = { id: win.webContents.id, resolve }
      timer = setTimeout(() => resolve(null), TIMEOUT)
      this.load(win, `share/${encodeURIComponent(puuid)}/${encodeURIComponent(matchId)}`)
    })
    if (timer) clearTimeout(timer)
    this.pending = null
    if (!win.isDestroyed()) win.destroy()
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
}
