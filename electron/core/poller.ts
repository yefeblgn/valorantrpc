import { EventEmitter } from 'events'
import { createHash } from 'crypto'
import { existsSync } from 'fs'
import type {
  AgentOption,
  DiscordUser,
  GameState,
  JoinRequest,
  Language,
  Settings,
  Snapshot
} from '@shared/types'
import { DISCORD_CLIENT_ID, riotLockfilePath } from '../constants'
import { RiotApi } from '../riot/api'
import { Content } from '../riot/content'
import { LocalAuth, RiotNotRunning } from '../riot/localAuth'
import { detectLocale, detectPlayer, detectRegionShard } from '../riot/region'
import { DiscordRPC } from './discordRpc'
import { buildDisplay, buildPresence, canInvite, type PartyInvite } from './presence'
import { idleState, isCustom, parsePresence, signature } from './state'

const INGAME_REFRESH = 10_000
const MMR_REFRESH = 300_000
const INVITE_RETRY = 60_000
const JOIN_REQUEST_TTL = 30_000
const PENDING_JOIN_TTL = 180_000
const MISSING_PRESENCE_LIMIT = 3
const PRESENCE_ERROR_LIMIT = 3
const SECRET_PREFIX = 'vrpc1'

export type NoticeKey =
  | 'join_waiting'
  | 'join_success'
  | 'join_requested'
  | 'join_failed'
  | 'join_request_notice'

export interface Notice {
  key: NoticeKey
  name?: string
}

interface JoinTarget {
  code: string
  partyId: string
}

function hashId(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 32)
}

function parseSecret(secret: string): JoinTarget | null {
  const [prefix, code, partyId] = secret.split('.')
  if (prefix !== SECRET_PREFIX || !partyId) return null
  return { code: code ?? '', partyId }
}

export class Poller extends EventEmitter {
  readonly content: Content
  readonly discord: DiscordRPC

  private stopped = true
  private state: GameState
  private valorantConnected = false
  private discordConnected = false
  private playerName = ''
  private playerTag = ''
  private auth: LocalAuth | null = null
  private api: RiotApi | null = null
  private startTs = Math.floor(Date.now() / 1000)
  private lastSignature: string | null = null
  private lastIngameFetch = 0
  private lastMmrFetch = 0
  private errorStreak = 0
  private presenceErrors = 0
  private missingPresence = 0
  private lastAutolockedMatch: string | null = null
  private invite: JoinTarget | null = null
  private inviteRetry = { partyId: '', at: 0 }
  private pendingJoin: (JoinTarget & { expiresAt: number }) | null = null
  private joinRequests: JoinRequest[] = []
  private wakeup: (() => void) | null = null

  constructor(
    private readonly getSettings: () => Settings,
    private readonly patchSettings: (p: Partial<Settings>) => void
  ) {
    super()
    const s = this.getSettings()
    this.content = new Content(s.language)
    this.discord = new DiscordRPC(DISCORD_CLIENT_ID)
    this.state = idleState()
    this.discord.on('disconnected', () => {
      this.discordConnected = false
      this.joinRequests = []
      this.notify()
    })
    this.discord.on('user', () => this.notify())
    this.discord.on('join', (secret: string) => void this.handleJoin(secret))
    this.discord.on('joinRequest', (user: DiscordUser) => this.addJoinRequest(user))
  }

  start(): void {
    if (!this.stopped) return
    this.stopped = false
    void this.loop()
  }

  async stop(): Promise<void> {
    this.stopped = true
    this.wakeup?.()
    this.discord.close()
  }

  forceRefresh(): void {
    this.lastSignature = null
    this.wakeup?.()
  }

  setLanguage(lang: Language): void {
    this.content.setLanguage(lang)
    this.forceRefresh()
  }

  getSnapshot(): Snapshot {
    const settings = this.getSettings()
    const now = Date.now()
    const presence =
      settings.rpcEnabled && this.state.sessionState !== 'idle'
        ? buildPresence(
            this.state,
            settings,
            this.content,
            settings.language,
            this.startTs,
            this.currentInvite()
          )
        : null
    return {
      state: this.state,
      connection: { valorant: this.valorantConnected, discord: this.discordConnected },
      player: { name: this.playerName, tag: this.playerTag },
      presence,
      display: buildDisplay(this.state, this.content),
      discordUser: this.discord.user,
      joinRequests: this.joinRequests.filter((r) => r.expiresAt > now)
    }
  }

  async getAgents(): Promise<AgentOption[]> {
    this.content.setLanguage(this.getSettings().language)
    await this.content.ensureAll()
    return this.content.playableAgents()
  }

  respondJoin(userId: string, accept: boolean): void {
    if (accept) this.discord.acceptJoin(userId)
    else this.discord.rejectJoin(userId)
    this.joinRequests = this.joinRequests.filter((r) => r.id !== userId)
    this.notify()
  }

  private pollMs(): number {
    const s = Math.min(Math.max(this.getSettings().pollInterval || 2, 1), 10)
    return s * 1000
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.wakeup = null
        resolve()
      }, ms)
      this.wakeup = (): void => {
        clearTimeout(timer)
        this.wakeup = null
        resolve()
      }
    })
  }

  private notify(): void {
    try {
      this.emit('snapshot', this.getSnapshot())
    } catch (e) {
      console.debug('[poller] notify error:', e)
    }
  }

  private emitNotice(notice: Notice): void {
    this.emit('notice', notice)
  }

  private async loop(): Promise<void> {
    this.discordConnected = await this.discord.connect()
    console.info(`[poller] Discord RPC: ${this.discordConnected ? 'connected' : 'not found'}`)
    this.notify()
    while (!this.stopped) {
      try {
        await this.tick()
        this.errorStreak = 0
        await this.wait(this.pollMs())
      } catch (e) {
        if (e instanceof RiotNotRunning) {
          this.setIdle()
          await this.wait(this.pollMs() * 2)
        } else {
          this.errorStreak++
          console.debug('[poller] tick error:', e)
          const backoff = Math.min(this.pollMs() * 2 ** Math.min(this.errorStreak, 4), 30_000)
          await this.wait(backoff)
        }
      }
    }
  }

  private async tick(): Promise<void> {
    const beforeDiscord = this.discordConnected
    if (!this.discord.connected) this.discordConnected = await this.discord.connect()
    else this.discordConnected = true
    if (beforeDiscord !== this.discordConnected) this.notify()

    await this.ensureConnection()
    const api = this.api
    if (!api) return

    const settings = this.getSettings()
    this.content.setLanguage(settings.language)
    await this.content.ensureAll()

    let priv: Record<string, unknown> | null
    try {
      priv = await api.selfPresence()
      this.presenceErrors = 0
    } catch (e) {
      console.debug('[poller] presence error:', String(e))
      if (++this.presenceErrors >= PRESENCE_ERROR_LIMIT) {
        this.presenceErrors = 0
        this.auth = null
        this.api = null
      }
      return
    }

    if (priv === null) {
      if (++this.missingPresence >= MISSING_PRESENCE_LIMIT) this.clearSession()
      return
    }
    this.missingPresence = 0

    const state = parsePresence(priv)
    state.name = this.playerName
    state.tag = this.playerTag

    const now = Date.now()
    const nearMatch =
      state.sessionState === 'ingame' || state.sessionState === 'pregame' || !!state.mapPath
    if (nearMatch) {
      const cacheOk = now - this.lastIngameFetch < INGAME_REFRESH
      if (cacheOk) {
        if (this.state.sessionState === 'ingame' || this.state.sessionState === 'pregame') {
          state.sessionState = this.state.sessionState
          state.agentUuid = this.state.agentUuid || state.agentUuid
        }
      } else {
        this.lastIngameFetch = now
        const phase = await api.matchPhase()
        if (phase) {
          state.sessionState = phase.phase
          state.agentUuid = phase.agent || this.state.agentUuid
          if (phase.queue_id) state.queueId = phase.queue_id
          if (phase.provisioning_flow) state.provisioningFlow = phase.provisioning_flow
        } else if (
          (state.sessionState === 'ingame' || state.sessionState === 'pregame') &&
          this.state.agentUuid
        ) {
          state.agentUuid = this.state.agentUuid
        }
      }
    }

    if (state.competitiveTier > 0) {
      if (this.state.rr !== null && now - this.lastMmrFetch < MMR_REFRESH) {
        state.rr = this.state.rr
      } else {
        const mmr = await api.mmr()
        if (mmr) {
          const [tier, rr] = mmr
          state.rr = rr
          if (tier) state.competitiveTier = tier
          this.lastMmrFetch = now
        } else {
          state.rr = this.state.rr
        }
      }
    }

    if (
      settings.autolockEnabled &&
      settings.autolockAgent &&
      state.sessionState === 'pregame' &&
      isCustom(state)
    ) {
      await this.handleAutolock(api, settings.autolockAgent)
    }

    if (settings.discordInvites && canInvite(state)) await this.ensureInvite(api, state.partyId)

    if (this.state.sessionState === 'idle' && state.sessionState !== 'idle') {
      this.startTs = Math.floor(now / 1000)
    }

    const wasConnected = this.valorantConnected
    this.valorantConnected = true
    this.state = state
    this.pushPresence(state)
    if (!wasConnected) this.notify()

    if (this.pendingJoin) {
      if (this.pendingJoin.expiresAt < now) this.pendingJoin = null
      else if (state.sessionState === 'menus') await this.executeJoin(api, this.pendingJoin)
    }
  }

  private async ensureConnection(): Promise<void> {
    if (!existsSync(riotLockfilePath())) throw new RiotNotRunning('lockfile gone')
    if (this.auth && this.auth.isValid()) {
      if (this.auth.tokensStale()) {
        await this.auth.refreshTokens().catch((e) => console.debug('[poller] token refresh:', e))
      }
      return
    }

    const auth = new LocalAuth()
    await auth.refresh()
    const [region, shard] = await detectRegionShard(auth)
    this.auth = auth
    this.api = new RiotApi(auth, region, shard)

    const settings = this.getSettings()
    if (!settings.languageDetected) {
      const lang = await detectLocale(auth)
      this.patchSettings({ language: lang, languageDetected: true })
      this.content.setLanguage(lang)
    }

    const [name, tag] = await detectPlayer(auth)
    this.playerName = name || this.playerName
    this.playerTag = tag || this.playerTag
    console.info(`[poller] Riot connected: ${name}#${tag} [${region}/${shard}]`)
  }

  private clearSession(): void {
    const changed = this.valorantConnected || this.state.sessionState !== 'idle'
    this.valorantConnected = false
    this.state = idleState(this.playerName, this.playerTag)
    this.lastSignature = null
    this.invite = null
    if (!changed) return
    if (this.discordConnected) this.discord.clear()
    this.notify()
  }

  private setIdle(): void {
    this.auth = null
    this.api = null
    this.presenceErrors = 0
    this.missingPresence = 0
    this.clearSession()
  }

  private currentInvite(): PartyInvite | null {
    const inv = this.invite
    if (!inv || inv.partyId !== this.state.partyId) return null
    return {
      partyId: hashId(inv.partyId),
      secret: `${SECRET_PREFIX}.${inv.code}.${inv.partyId}`
    }
  }

  private async ensureInvite(api: RiotApi, partyId: string): Promise<void> {
    if (this.invite?.partyId === partyId) return
    if (this.inviteRetry.partyId === partyId && Date.now() < this.inviteRetry.at) return
    const code = await api.partyInviteCode(partyId)
    if (code) {
      this.invite = { partyId, code }
    } else {
      this.invite = null
      this.inviteRetry = { partyId, at: Date.now() + INVITE_RETRY }
    }
  }

  private async handleJoin(secret: string): Promise<void> {
    const target = parseSecret(secret)
    if (!target || target.partyId === this.state.partyId) return
    const api = this.api
    if (!api || this.state.sessionState !== 'menus') {
      this.pendingJoin = { ...target, expiresAt: Date.now() + PENDING_JOIN_TTL }
      this.emitNotice({ key: 'join_waiting' })
      this.wakeup?.()
      return
    }
    await this.executeJoin(api, target)
  }

  private async executeJoin(api: RiotApi, target: JoinTarget): Promise<void> {
    this.pendingJoin = null
    if (target.code && (await api.joinByCode(target.code))) {
      this.emitNotice({ key: 'join_success' })
    } else if (await api.requestJoin(target.partyId)) {
      this.emitNotice({ key: 'join_requested' })
    } else {
      this.emitNotice({ key: 'join_failed' })
    }
    this.forceRefresh()
  }

  private addJoinRequest(user: DiscordUser): void {
    const now = Date.now()
    this.joinRequests = [
      ...this.joinRequests.filter((r) => r.id !== user.id && r.expiresAt > now),
      { ...user, expiresAt: now + JOIN_REQUEST_TTL }
    ]
    this.emitNotice({ key: 'join_request_notice', name: user.globalName || user.username })
    this.notify()
  }

  private pushPresence(state: GameState): void {
    const settings = this.getSettings()
    const invite = this.currentInvite()
    const sig = [
      signature(state),
      settings.rpcEnabled,
      settings.language,
      this.discordConnected,
      invite?.secret ?? ''
    ].join('|')
    if (sig === this.lastSignature) return
    this.lastSignature = sig

    if (!settings.rpcEnabled) {
      this.discord.clear()
    } else {
      const built = buildPresence(
        state,
        settings,
        this.content,
        settings.language,
        this.startTs,
        invite
      )
      if (built) {
        const ok = this.discord.update(built)
        this.discordConnected = ok || this.discord.connected
      } else {
        this.discord.clear()
      }
    }
    this.notify()
  }

  private async handleAutolock(api: RiotApi, target: string): Promise<void> {
    const puuid = this.auth?.puuid
    if (!puuid) return
    try {
      const r = await api.remoteGet(`${api.glz}/pregame/v1/players/${puuid}`)
      const matchId = r.status === 200 ? r.data?.MatchID : null
      if (!matchId) {
        this.lastAutolockedMatch = null
        return
      }
      if (this.lastAutolockedMatch === matchId) return

      const rm = await api.remoteGet(`${api.glz}/pregame/v1/matches/${matchId}`)
      if (rm.status !== 200) return
      const matchData = rm.data ?? {}
      if (!String(matchData.ProvisioningFlowID ?? '').toLowerCase().includes('custom')) {
        this.lastAutolockedMatch = matchId
        return
      }

      let teams: Array<{ Players?: Array<Record<string, unknown>> }> = matchData.Teams ?? []
      if (matchData.AllyTeam) teams = [...teams, matchData.AllyTeam]
      const myPlayer = teams
        .flatMap((team) => team.Players ?? [])
        .find((player) => player.Subject === puuid)
      if (!myPlayer) return

      const charState = String(myPlayer.CharacterSelectionState ?? '')
      const currentChar = String(myPlayer.CharacterID ?? '')
      const agentName = this.content.agentName(target) || target

      if (charState === 'locked' && currentChar.toLowerCase() === target.toLowerCase()) {
        this.lastAutolockedMatch = matchId
        return
      }

      console.info(`[autolock] locking ${agentName} in custom match ${matchId}`)
      await api.selectAgent(matchId, target)
      if (await api.lockAgent(matchId, target)) {
        console.info(`[autolock] locked ${agentName}`)
        this.lastAutolockedMatch = matchId
      } else {
        console.warn(`[autolock] failed to lock ${agentName}`)
      }
    } catch (e) {
      console.error('[autolock] error:', e)
    }
  }
}
