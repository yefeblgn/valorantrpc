import net from 'net'
import { EventEmitter } from 'events'
import { randomUUID } from 'crypto'
import type { BuiltPresence, DiscordUser } from '@shared/types'

const OP_HANDSHAKE = 0
const OP_FRAME = 1
const OP_CLOSE = 2
const OP_PING = 3
const OP_PONG = 4

const TEXT_MAX = 128
const BUTTON_LABEL_MAX = 32
const SUBSCRIPTIONS = ['ACTIVITY_JOIN', 'ACTIVITY_JOIN_REQUEST']

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

function text(value: string | undefined, max = TEXT_MAX): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const clipped = trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed
  return clipped.length < 2 ? `${clipped}⠀` : clipped
}

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
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
  party?: { id?: string; size?: [number, number] }
  secrets?: { join?: string }
  buttons?: { label: string; url: string }[]
  instance?: boolean
}

interface RpcUser {
  id?: string
  username?: string
  global_name?: string
  avatar?: string | null
}

interface RpcMessage {
  cmd?: string
  evt?: string
  data?: {
    user?: RpcUser
    secret?: string
    code?: number
    message?: string
  }
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

        const timer = setTimeout(() => {
          if (!settled) {
            settled = true
            this.off('__ready', onReady)
            this.connected = !!this.socket && !this.socket.destroyed
            resolve(this.connected)
          }
        }, 2000)

        const onReady = (): void => {
          clearTimeout(timer)
          if (!settled) {
            settled = true
            this.connected = true
            resolve(true)
          }
        }
        this.once('__ready', onReady)
      })
    })
  }

  private onData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk])
    while (this.buffer.length >= 8) {
      const op = this.buffer.readInt32LE(0)
      const len = this.buffer.readInt32LE(4)
      if (this.buffer.length < 8 + len) break
      const payload = this.buffer.subarray(8, 8 + len)
      this.buffer = this.buffer.subarray(8 + len)

      if (op === OP_CLOSE) {
        this.handleClose()
        return
      }
      if (op === OP_PING) {
        this.writeRaw(OP_PONG, payload)
        continue
      }
      if (op !== OP_FRAME) continue

      let msg: RpcMessage
      try {
        msg = JSON.parse(payload.toString('utf-8'))
      } catch {
        continue
      }
      this.handleMessage(msg)
    }
  }

  private handleMessage(msg: RpcMessage): void {
    if (msg.evt === 'ERROR') {
      console.warn(`[discord] ${msg.cmd ?? 'RPC'} error:`, msg.data?.code, msg.data?.message)
      return
    }
    if (msg.cmd !== 'DISPATCH') return

    switch (msg.evt) {
      case 'READY': {
        const u = msg.data?.user
        if (u?.id) {
          this.user = toUser(u)
          this.emit('user', this.user)
        }
        for (const evt of SUBSCRIPTIONS) this.send('SUBSCRIBE', undefined, evt)
        this.emit('__ready')
        break
      }
      case 'ACTIVITY_JOIN':
        if (msg.data?.secret) this.emit('join', msg.data.secret)
        break
      case 'ACTIVITY_JOIN_REQUEST':
        if (msg.data?.user?.id) this.emit('joinRequest', toUser(msg.data.user))
        break
    }
  }

  private writeRaw(op: number, body: Buffer): void {
    if (!this.socket || this.socket.destroyed) return
    const header = Buffer.alloc(8)
    header.writeInt32LE(op, 0)
    header.writeInt32LE(body.length, 4)
    try {
      this.socket.write(Buffer.concat([header, body]))
    } catch {
      this.handleClose()
    }
  }

  private write(op: number, obj: unknown): void {
    this.writeRaw(op, Buffer.from(JSON.stringify(obj), 'utf-8'))
  }

  private send(cmd: string, args?: unknown, evt?: string): boolean {
    if (!this.socket || this.socket.destroyed) return false
    this.write(OP_FRAME, { cmd, args, evt, nonce: randomUUID() })
    return true
  }

  private toActivity(p: BuiltPresence): DiscordActivity {
    const a: DiscordActivity = { instance: false }
    const details = text(p.details)
    const state = text(p.state)
    if (details) a.details = details
    if (state) a.state = state
    if (p.startTimestamp) a.timestamps = { start: p.startTimestamp }

    const assets: DiscordActivity['assets'] = {}
    if (p.largeImage) assets.large_image = p.largeImage
    if (p.smallImage) assets.small_image = p.smallImage
    const largeText = text(p.largeText)
    const smallText = text(p.smallText)
    if (largeText && assets.large_image) assets.large_text = largeText
    if (smallText && assets.small_image) assets.small_text = smallText
    if (Object.keys(assets).length) a.assets = assets

    if (p.partySize) a.party = { size: p.partySize }
    if (p.joinSecret && p.partyId && p.partySize) {
      a.party = { id: p.partyId, size: p.partySize }
      a.secrets = { join: p.joinSecret }
      return a
    }

    const buttons = (p.buttons ?? [])
      .map((b) => ({ label: text(b.label, BUTTON_LABEL_MAX) ?? '', url: b.url.trim() }))
      .filter((b) => b.label && isHttpUrl(b.url))
      .slice(0, 2)
    if (buttons.length) a.buttons = buttons
    return a
  }

  update(presence: BuiltPresence): boolean {
    if (!this.connected) return false
    return this.send('SET_ACTIVITY', { pid: process.pid, activity: this.toActivity(presence) })
  }

  clear(): void {
    if (!this.connected) return
    this.send('SET_ACTIVITY', { pid: process.pid, activity: null })
  }

  acceptJoin(userId: string): void {
    this.send('SEND_ACTIVITY_JOIN_INVITE', { user_id: userId })
  }

  rejectJoin(userId: string): void {
    this.send('CLOSE_ACTIVITY_REQUEST', { user_id: userId })
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
      this.socket.removeAllListeners()
      this.socket.destroy()
      this.socket = null
    }
    this.connected = false
  }
}

function toUser(u: RpcUser): DiscordUser {
  return {
    id: u.id ?? '',
    username: u.username ?? '',
    globalName: u.global_name || u.username || '',
    avatar: u.avatar ?? null
  }
}
