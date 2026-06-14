import net from 'net'
import { EventEmitter } from 'events'
import { randomUUID } from 'crypto'
import type { BuiltPresence, DiscordUser } from '@shared/types'

const OP_HANDSHAKE = 0
const OP_FRAME = 1
const OP_CLOSE = 2

function ipcPath(id: number): string {
  
  if (process.platform === 'win32') return `\\\\?\\pipe\\discord-ipc-${id}`
  const base =
    process.env.XDG_RUNTIME_DIR ||
    process.env.TMPDIR ||
    process.env.TMP ||
    process.env.TEMP ||
    '/tmp'
  return `${base.replace(/\/$/, '')}/discord-ipc-${id}`
}

interface DiscordActivity {
  state?: string
  details?: string
  timestamps?: { start?: number }
  assets?: {
    large_image?: string
    large_text?: string
    small_image?: string
    small_text?: string
  }
  party?: { size?: [number, number] }
  buttons?: { label: string; url: string }[]
}


export class DiscordRPC extends EventEmitter {
  connected = false
  user: DiscordUser | null = null
  private socket: net.Socket | null = null
  private buffer = Buffer.alloc(0)
  private connecting = false

  constructor(private clientId: string) {
    super()
  }

  async connect(): Promise<boolean> {
    if (this.connected) return true
    if (this.connecting) return false
    this.connecting = true
    try {
      for (let id = 0; id < 10; id++) {
        const ok = await this.tryPipe(id).catch(() => false)
        if (ok) return true
      }
      return false
    } finally {
      this.connecting = false
    }
  }

  private tryPipe(id: number): Promise<boolean> {
    return new Promise((resolve) => {
      const sock = net.createConnection(ipcPath(id))
      let settled = false

      const onError = (): void => {
        if (!settled) {
          settled = true
          sock.destroy()
          resolve(false)
        }
      }

      sock.once('error', onError)
      sock.once('connect', () => {
        sock.removeListener('error', onError)
        this.socket = sock
        this.buffer = Buffer.alloc(0)
        sock.on('data', (d) => this.onData(d))
        sock.on('error', () => this.handleClose())
        sock.on('close', () => this.handleClose())

        
        this.write(OP_HANDSHAKE, { v: 1, client_id: this.clientId })

        const onReady = (): void => {
          if (!settled) {
            settled = true
            this.connected = true
            resolve(true)
          }
        }
        this.once('__ready', onReady)

        
        setTimeout(() => {
          if (!settled) {
            settled = true
            this.connected = !!this.socket && !this.socket.destroyed
            resolve(this.connected)
          }
        }, 2000)
      })
    })
  }

  private onData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk])
    while (this.buffer.length >= 8) {
      const op = this.buffer.readInt32LE(0)
      const len = this.buffer.readInt32LE(4)
      if (this.buffer.length < 8 + len) break
      const payload = this.buffer.subarray(8, 8 + len).toString('utf-8')
      this.buffer = this.buffer.subarray(8 + len)
      let data: {
        cmd?: string
        evt?: string
        data?: { user?: { id?: string; username?: string; global_name?: string; avatar?: string | null } }
      } = {}
      try {
        data = JSON.parse(payload)
      } catch {
        
      }
      if (op === OP_CLOSE) {
        this.handleClose()
        return
      }
      if (op === OP_FRAME && data.cmd === 'DISPATCH' && data.evt === 'READY') {
        const u = data.data?.user
        if (u?.id) {
          this.user = {
            id: u.id,
            username: u.username ?? '',
            globalName: u.global_name ?? u.username ?? '',
            avatar: u.avatar ?? null
          }
          this.emit('user', this.user)
        }
        this.emit('__ready')
      }
    }
  }

  private write(op: number, obj: unknown): void {
    if (!this.socket || this.socket.destroyed) return
    const json = Buffer.from(JSON.stringify(obj), 'utf-8')
    const header = Buffer.alloc(8)
    header.writeInt32LE(op, 0)
    header.writeInt32LE(json.length, 4)
    try {
      this.socket.write(Buffer.concat([header, json]))
    } catch {
      this.handleClose()
    }
  }

  private toActivity(p: BuiltPresence): DiscordActivity {
    const a: DiscordActivity = {}
    if (p.details) a.details = p.details
    if (p.state) a.state = p.state
    if (p.startTimestamp) a.timestamps = { start: p.startTimestamp }
    const assets: DiscordActivity['assets'] = {}
    if (p.largeImage) assets.large_image = p.largeImage
    if (p.largeText) assets.large_text = p.largeText
    if (p.smallImage) assets.small_image = p.smallImage
    if (p.smallText) assets.small_text = p.smallText
    if (Object.keys(assets).length) a.assets = assets
    if (p.partySize) a.party = { size: p.partySize }
    if (p.buttons && p.buttons.length) a.buttons = p.buttons.slice(0, 2)
    return a
  }

  update(presence: BuiltPresence): boolean {
    if (!this.connected || !this.socket) return false
    try {
      this.write(OP_FRAME, {
        cmd: 'SET_ACTIVITY',
        args: { pid: process.pid, activity: this.toActivity(presence) },
        nonce: randomUUID()
      })
      return true
    } catch (e) {
      console.debug('[discord] update failed:', e)
      this.connected = false
      return false
    }
  }

  clear(): void {
    if (!this.connected || !this.socket) return
    this.write(OP_FRAME, {
      cmd: 'SET_ACTIVITY',
      args: { pid: process.pid, activity: null },
      nonce: randomUUID()
    })
  }

  private handleClose(): void {
    const was = this.connected
    this.connected = false
    this.user = null
    if (this.socket) {
      this.socket.removeAllListeners()
      this.socket.destroy()
      this.socket = null
    }
    if (was) this.emit('disconnected')
  }

  close(): void {
    if (this.socket) {
      try {
        this.socket.destroy()
      } catch {
        
      }
      this.socket = null
    }
    this.connected = false
  }
}
