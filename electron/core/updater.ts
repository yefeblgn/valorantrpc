import { app, BrowserWindow, net, shell } from 'electron'
import { spawn } from 'child_process'
import { createHash } from 'crypto'
import { createWriteStream, rmSync } from 'fs'
import { Readable, Transform } from 'stream'
import { pipeline } from 'stream/promises'
import type { ReadableStream as WebReadableStream } from 'stream/web'
import pkg from 'electron-updater'
import type { UpdateInfo as FeedInfo } from 'electron-updater'
import type { UpdateInfo } from '@shared/types'
import { IPC } from '@shared/ipc'
import { GITHUB_RELEASES_PAGE, GITHUB_URL, executablePath, isPortable } from '../constants'

const { autoUpdater } = pkg

interface PortableAsset {
  url: string
  sha512: string
  size: number
}

let state: UpdateInfo = {
  checking: false,
  checkedAt: null,
  portable: isPortable(),
  manual: false,
  available: false,
  currentVersion: app.getVersion(),
  latestVersion: app.getVersion(),
  downloading: false,
  progress: 0,
  bytesPerSecond: 0,
  downloaded: false,
  error: null
}

let portableAsset: PortableAsset | null = null
let portableFile: string | null = null
let portableApplied = false

function broadcast(): void {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send(IPC.updateState, state)
  }
}

function set(p: Partial<UpdateInfo>): void {
  state = { ...state, ...p }
  broadcast()
}

function findPortableAsset(info: FeedInfo): PortableAsset | null {
  const file = info.files.find((f) => /-portable\.exe$/i.test(f.url))
  if (!file?.sha512) return null
  const tag = (info as FeedInfo & { tag?: string }).tag || `v${info.version}`
  const url = /^https?:\/\//i.test(file.url)
    ? file.url
    : `${GITHUB_URL}/releases/download/${tag}/${file.url.replace(/ /g, '-')}`
  return { url, sha512: file.sha512, size: file.size ?? 0 }
}

export function initUpdater(): void {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = !state.portable

  autoUpdater.on('update-available', (info) => {
    if (state.portable) portableAsset = findPortableAsset(info)
    set({
      available: true,
      latestVersion: info.version,
      manual: state.portable && !portableAsset,
      error: null
    })
  })
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

  if (state.portable) {
    discard(portableTarget())
    app.on('will-quit', () => applyPortable(false))
  }
}

function portableTarget(): string {
  return `${executablePath()}.update`
}

function discard(file: string): void {
  try {
    rmSync(file, { force: true })
  } catch (e) {
    console.debug('[updater] could not remove', file, e)
  }
}

export function getUpdateState(): UpdateInfo {
  return state
}

export async function checkForUpdates(): Promise<UpdateInfo> {
  if (state.checking || state.downloading || state.downloaded) return state
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
    startPortableUpdate()
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

function startPortableUpdate(): void {
  if (state.downloaded && portableFile) {
    applyPortable(true)
    app.quit()
    return
  }
  if (state.downloading) return
  if (state.manual || !portableAsset) {
    void shell.openExternal(GITHUB_RELEASES_PAGE)
    return
  }
  const asset = portableAsset
  const target = portableTarget()
  set({ downloading: true, progress: 0, bytesPerSecond: 0, error: null })
  downloadPortable(asset, target)
    .then(() => {
      portableFile = target
      set({ downloading: false, downloaded: true, progress: 1 })
    })
    .catch((e: NodeJS.ErrnoException) => {
      discard(target)
      const denied = e?.code === 'EPERM' || e?.code === 'EACCES'
      set({ downloading: false, manual: denied, error: String(e?.message ?? e) })
    })
}

async function downloadPortable(asset: PortableAsset, target: string): Promise<void> {
  const res = await net.fetch(asset.url)
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
  const total = Number(res.headers.get('content-length')) || asset.size
  const hash = createHash('sha512')
  const started = Date.now()
  let received = 0
  let emitted = 0

  const meter = new Transform({
    transform(chunk: Buffer, _enc, done) {
      hash.update(chunk)
      received += chunk.length
      const now = Date.now()
      if (now - emitted > 150) {
        emitted = now
        const secs = (now - started) / 1000
        set({
          progress: total ? Math.min(received / total, 1) : 0,
          bytesPerSecond: secs > 0 ? received / secs : 0
        })
      }
      done(null, chunk)
    }
  })

  await pipeline(
    Readable.fromWeb(res.body as unknown as WebReadableStream<Uint8Array>),
    meter,
    createWriteStream(target)
  )
  if (hash.digest('base64') !== asset.sha512) throw new Error('sha512 checksum mismatch')
}

function psQuote(s: string): string {
  return `'${s.replace(/'/g, "''")}'`
}

function applyPortable(relaunch: boolean): void {
  if (!portableFile || portableApplied) return
  portableApplied = true
  const script = [
    `$src = ${psQuote(portableFile)}`,
    `$dst = ${psQuote(executablePath())}`,
    `Wait-Process -Id ${process.pid} -Timeout 30 -ErrorAction SilentlyContinue`,
    'for ($i = 0; $i -lt 120; $i++) {',
    '  try { Move-Item -LiteralPath $src -Destination $dst -Force -ErrorAction Stop; break }',
    '  catch { Start-Sleep -Milliseconds 500 }',
    '}',
    relaunch ? 'Start-Process -FilePath $dst' : ''
  ].join('\n')
  try {
    spawn(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-WindowStyle',
        'Hidden',
        '-EncodedCommand',
        Buffer.from(script, 'utf16le').toString('base64')
      ],
      { detached: true, stdio: 'ignore', windowsHide: true }
    ).unref()
  } catch (e) {
    portableApplied = false
    console.warn('[updater] portable apply failed:', e)
  }
}

export function maybeAutoCheck(enabled: boolean): void {
  if (enabled && app.isPackaged) {
    setTimeout(() => void checkForUpdates(), 4000)
  }
}
