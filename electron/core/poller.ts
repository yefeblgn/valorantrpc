import { EventEmitter } from 'events'
import { existsSync } from 'fs'
import type { AgentOption, GameState, Language, Settings, Snapshot } from '@shared/types'
import { DISCORD_CLIENT_ID, riotLockfilePath } from '../constants'
import { RiotApi } from '../riot/api'
import { Content } from '../riot/content'
import { LocalAuth, RiotNotRunning } from '../riot/localAuth'
import { detectLocale, detectPlayer, detectRegionShard } from '../riot/region'
import { DiscordRPC } from './discordRpc'
import { buildDisplay, buildPresence } from './presence'
import { idleState, parsePresence, signature } from './state'

const INGAME_REFRESH = 10_000
const MMR_REFRESH = 300_000


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
  private region = ''
  private shard = ''
  private readonly startTs = Math.floor(Date.now() / 1000)
  private lastSignature: string | null = null
  private lastIngameFetch = 0
  private lastMmrFetch = 0
  private errorStreak = 0
  private presenceFailStreak = 0
  private lastAutolockedMatch: string | null = null
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
      this.notify()
    })
    this.discord.on('user', () => this.notify())
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
    const presence =
      settings.rpcEnabled && this.state.sessionState !== 'idle'
        ? buildPresence(this.state, settings, this.content, settings.language, this.startTs)
        : null
    return {
      state: this.state,
      connection: { valorant: this.valorantConnected, discord: this.discordConnected },
      player: { name: this.playerName, tag: this.playerTag },
      presence,
      display: buildDisplay(this.state, this.content),
      discordUser: this.discord.user
    }
  }

  async getAgents(): Promise<AgentOption[]> {
    this.content.setLanguage(this.getSettings().language)
    await this.content.ensureAll()
    return this.content.playableAgents()
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

    const settings = this.getSettings()
    this.content.setLanguage(settings.language)
    await this.content.ensureAll()

    if (settings.autolockEnabled && settings.autolockAgent) {
      await this.handleAutolock()
    }

    const priv = this.api ? await this.api.selfPresence() : null
    if (priv === null) {
      this.presenceFailStreak++
      if (this.presenceFailStreak >= 3) {
        
        this.auth = null
        this.api = null
      }
      return
    }
    this.presenceFailStreak = 0

    const state = parsePresence(priv)
    state.name = this.playerName
    state.tag = this.playerTag

    const now = Date.now()
    const nearMatch =
      state.sessionState === 'ingame' || state.sessionState === 'pregame' || !!state.mapPath
    if (nearMatch && this.api) {
      const cacheOk = now - this.lastIngameFetch < INGAME_REFRESH
      if (cacheOk) {
        if (this.state.sessionState === 'ingame' || this.state.sessionState === 'pregame') {
          state.sessionState = this.state.sessionState
          state.agentUuid = this.state.agentUuid || state.agentUuid
        }
      } else {
        this.lastIngameFetch = now
        const phase = await this.api.matchPhase()
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

    if (state.competitiveTier > 0 && this.api) {
      if (this.state.rr !== null && now - this.lastMmrFetch < MMR_REFRESH) {
        state.rr = this.state.rr
      } else {
        const mmr = await this.api.mmr()
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

    this.state = state
    this.pushPresence(state)
  }

  private async ensureConnection(): Promise<void> {
    if (!existsSync(riotLockfilePath())) throw new RiotNotRunning('lockfile gone')
    if (this.auth && this.auth.isValid()) return

    const auth = new LocalAuth()
    await auth.refresh()
    const [region, shard] = await detectRegionShard(auth)
    this.auth = auth
    this.region = region
    this.shard = shard
    this.api = new RiotApi(auth, region, shard)

    const settings = this.getSettings()
    if (!settings.languageDetected) {
      const lang = await detectLocale(auth)
      this.patchSettings({ language: lang, languageDetected: true })
      this.content.setLanguage(lang)
    }

    const [name, tag] = await detectPlayer(auth)
    const wasConnected = this.valorantConnected
    this.playerName = name || this.playerName
    this.playerTag = tag || this.playerTag
    this.valorantConnected = true
    console.info(`[poller] Riot connected: ${name}#${tag} [${region}/${shard}]`)
    if (!wasConnected) this.notify()
  }

  private setIdle(): void {
    const changed = this.valorantConnected || this.state.sessionState !== 'idle'
    this.valorantConnected = false
    this.state = idleState(this.playerName, this.playerTag)
    this.lastSignature = null
    this.auth = null
    this.api = null
    this.presenceFailStreak = 0
    if (this.discordConnected) this.discord.clear()
    if (changed) this.notify()
  }

  private pushPresence(state: GameState): void {
    const settings = this.getSettings()
    const sig = `${signature(state)}|${settings.rpcEnabled}|${settings.language}|${this.discordConnected}`
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
        this.startTs
      )
      if (built) {
        const ok = this.discord.update(built)
        this.discordConnected = ok || this.discord.connected
      }
    }
    this.notify()
  }

  
  private async handleAutolock(): Promise<void> {
    const auth = this.auth
    const api = this.api
    if (!api || !auth || !auth.isValid()) return
    const target = this.getSettings().autolockAgent
    try {
      const r = await api.remoteGet(`${api.glz}/pregame/v1/players/${auth.puuid}`)
      if (r.status !== 200) {
        this.lastAutolockedMatch = null
        return
      }
      const matchId = r.data?.MatchID
      if (!matchId) {
        this.lastAutolockedMatch = null
        return
      }
      if (this.lastAutolockedMatch === matchId) return

      const rm = await api.remoteGet(`${api.glz}/pregame/v1/matches/${matchId}`)
      if (rm.status !== 200) return
      const matchData = rm.data ?? {}

      let teams: Array<{ Players?: Array<Record<string, unknown>> }> = matchData.Teams ?? []
      if (matchData.AllyTeam) teams = [...teams, matchData.AllyTeam]

      let myPlayer: Record<string, unknown> | null = null
      for (const team of teams) {
        for (const player of team.Players ?? []) {
          if (player.Subject === auth.puuid) {
            myPlayer = player
            break
          }
        }
        if (myPlayer) break
      }
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
      const ok = await api.lockAgent(matchId, target)
      if (ok) {
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
