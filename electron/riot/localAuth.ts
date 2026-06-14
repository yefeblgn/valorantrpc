import { existsSync, readFileSync } from 'fs'
import type { AxiosResponse } from 'axios'
import { riotClient, webClient } from '../lib/http'
import {
  CLIENT_PLATFORM,
  FALLBACK_CLIENT_VERSION,
  VALORANT_API,
  riotLockfilePath
} from '../constants'

export class RiotNotRunning extends Error {}

interface Lock {
  name: string
  pid: string
  port: string
  password: string
  protocol: string
}

function readLockfile(): Lock {
  const path = riotLockfilePath()
  if (!existsSync(path)) throw new RiotNotRunning('lockfile not found')
  try {
    const parts = readFileSync(path, 'utf-8').trim().split(':')
    const [name, pid, port, password, protocol] = parts
    return { name, pid, port, password, protocol }
  } catch (e) {
    throw new RiotNotRunning(`lockfile read error: ${String(e)}`)
  }
}


export class LocalAuth {
  port: string | null = null
  password: string | null = null
  protocol = 'https'
  accessToken: string | null = null
  entitlementToken: string | null = null
  puuid: string | null = null
  clientVersion: string | null = null

  get localBase(): string {
    return `${this.protocol}://127.0.0.1:${this.port}`
  }

  private basicAuth(): string {
    return 'Basic ' + Buffer.from(`riot:${this.password ?? ''}`).toString('base64')
  }

  localGet(path: string, timeout = 5000): Promise<AxiosResponse> {
    return riotClient.get(this.localBase + path, {
      headers: { Authorization: this.basicAuth() },
      timeout
    })
  }

  async refresh(): Promise<boolean> {
    const lock = readLockfile()
    this.port = lock.port
    this.password = lock.password
    this.protocol = lock.protocol

    let r: AxiosResponse
    try {
      r = await this.localGet('/entitlements/v1/token')
    } catch (e) {
      throw new RiotNotRunning(`local API unreachable: ${String(e)}`)
    }
    if (r.status !== 200) throw new RiotNotRunning(`entitlements HTTP ${r.status}`)

    const data = r.data ?? {}
    this.accessToken = data.accessToken ?? null
    this.entitlementToken = data.token ?? null
    this.puuid = data.subject ?? null
    if (!this.accessToken || !this.entitlementToken || !this.puuid) {
      throw new RiotNotRunning('incomplete entitlements response')
    }
    if (!this.clientVersion) this.clientVersion = await this.fetchClientVersion()
    return true
  }

  private async fetchClientVersion(): Promise<string> {
    try {
      const r = await webClient.get(`${VALORANT_API}/version`)
      if (r.status === 200) return r.data.data.riotClientVersion
    } catch {
      
    }
    return FALLBACK_CLIENT_VERSION
  }

  pdGlzHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'X-Riot-Entitlements-JWT': this.entitlementToken ?? '',
      'X-Riot-ClientPlatform': CLIENT_PLATFORM,
      'X-Riot-ClientVersion': this.clientVersion ?? FALLBACK_CLIENT_VERSION
    }
  }

  isValid(): boolean {
    return !!(this.accessToken && this.entitlementToken && this.puuid)
  }
}
