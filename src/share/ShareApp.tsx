import { useEffect, useState } from 'react'
import { Crown } from 'lucide-react'
import type { Catalog, HistoryPlayer, MatchDetail, MatchSummary } from '@shared/history'
import { acs, pct } from '@shared/history'
import { AppLogo, STUDIO } from '../components/brand'
import { RESULT_COLOR, formatDate, signed } from '../components/career/common'
import { initStore, useStore } from '../store'
import { useT } from '../lib/i18n'
import { useAppearance } from '../lib/useAppearance'
import { formatDuration } from '../lib/career'
import { agentOf, mapOf, modeOf, tierOf } from '../lib/history'
import { apiLanguage } from '@shared/i18n'

const ALLY = '#3ed6b4'
const ENEMY = '#ff4655'

interface Loaded {
  detail: MatchDetail
  catalog: Catalog
  summary: MatchSummary | null
}

function waitForImages(): Promise<void> {
  const pending = [...document.images].filter((img) => !img.complete)
  return Promise.all(
    pending.map(
      (img) =>
        new Promise<void>((resolve) => {
          img.addEventListener('load', () => resolve(), { once: true })
          img.addEventListener('error', () => resolve(), { once: true })
        })
    )
  ).then(() => undefined)
}

export function ShareApp({ puuid, id }: { puuid: string; id: string }): JSX.Element {
  const t = useT()
  const settings = useStore((s) => s.settings)
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  useAppearance({ themed: false })

  useEffect(() => {
    void initStore()
    void Promise.all([
      window.api.getMatchDetail(id, puuid),
      window.api.getCatalog(),
      window.api.getHistory(puuid)
    ]).then(([detail, catalog, data]) => {
      if (!detail) return window.api.shareReady()
      setLoaded({ detail, catalog, summary: data.matches.find((m) => m.id === id) ?? null })
    })
  }, [id, puuid])

  useEffect(() => {
    if (!loaded || !settings) return
    let cancelled = false
    void waitForImages().then(() =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (!cancelled) window.api.shareReady()
        })
      )
    )
    return () => {
      cancelled = true
    }
  }, [loaded, settings])

  if (!loaded || !settings) return <div className="h-[675px] w-[1200px] bg-bg" />

  const { detail, catalog, summary } = loaded
  const streamer = settings.streamerMode
  const locale = apiLanguage(settings.language)
  const me = detail.players.findIndex((p) => p.puuid === puuid)
  const self = detail.players[me]
  const map = mapOf(catalog, detail.map)
  const agent = agentOf(catalog, self?.agent ?? '')
  const result = summary?.result ?? 'loss'
  const myTeam = self?.team ?? ''
  const roundBased = detail.teams.length === 2
  const teams = roundBased
    ? [...detail.teams].sort((a, b) => Number(b.id === myTeam) - Number(a.id === myTeam))
    : [{ id: '', won: false, rounds: 0, points: 0 }]
  const label = (p: HistoryPlayer): string =>
    streamer || !p.name ? agentOf(catalog, p.agent).name : `${p.name}#${p.tag}`
  const top = Math.max(...detail.players.map((p) => p.score))

  return (
    <div className="relative h-[675px] w-[1200px] overflow-hidden bg-bg text-text">
      {map.splash && (
        <img
          src={map.splash}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0b0e13] via-[#0b0e13]/85 to-[#0b0e13]/55" />
      <div
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: RESULT_COLOR[result] }}
      />

      <div className="relative grid h-full grid-cols-[400px_minmax(0,1fr)] gap-8 p-10">
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-2.5">
            <AppLogo size={24} />
            <span className="display text-[17px] tracking-[0.08em]">
              Valorant<span className="text-accent">RPC</span>
            </span>
          </div>
          <div
            className="mt-8 display text-[56px] leading-none tracking-[0.03em]"
            style={{ color: RESULT_COLOR[result] }}
          >
            {t(`result_${result}`)}
          </div>
          <div className="display mt-2 text-[44px] leading-none tabular-nums">
            {summary ? `${summary.ally} : ${summary.enemy}` : ''}
          </div>
          <div className="mt-3 text-[15px] text-muted">
            <span className="display text-[18px] tracking-[0.06em] text-text">{map.name}</span>
            {' · '}
            {modeOf(catalog, detail).name}
          </div>
          <div className="text-[13px] text-dim">
            {formatDate(locale, detail.start)} · {formatDuration(detail.length, locale)}
          </div>

          {self && (
            <div className="mt-auto flex items-center gap-4">
              {agent.icon && (
                <img
                  src={agent.icon}
                  alt=""
                  className="h-20 w-20 border border-line-2 bg-panel-2 object-cover"
                />
              )}
              <div className="min-w-0">
                <div className="display truncate text-[22px] tracking-[0.04em]">
                  {streamer ? agent.name : `${self.name}`}
                </div>
                <div className="display mt-1 text-[30px] leading-none tabular-nums">
                  {self.kills} / {self.deaths} / {self.assists}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 text-[13px] text-muted">
                  {roundBased && (
                    <span>
                      {t('acs')} <b className="display text-[16px] text-text">{acs(self)}</b>
                    </span>
                  )}
                  {roundBased && (
                    <span>
                      ADR{' '}
                      <b className="display text-[16px] text-text">
                        {self.rounds ? Math.round(self.damage / self.rounds) : 0}
                      </b>
                    </span>
                  )}
                  <span>
                    HS{' '}
                    <b className="display text-[16px] text-text">
                      {pct(self.head, self.head + self.body + self.leg)}%
                    </b>
                  </span>
                  {summary?.rr && !streamer && (
                    <b
                      className={`display text-[16px] ${summary.rr.change >= 0 ? 'text-good' : 'text-bad'}`}
                    >
                      {signed(summary.rr.change)} RR
                    </b>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col justify-center gap-4">
          {teams.map((team) => {
            const color = !roundBased ? '#98a0ab' : team.id === myTeam ? ALLY : ENEMY
            const players = detail.players
              .filter((p) => !roundBased || p.team === team.id)
              .sort((a, b) => b.score - a.score)
              .slice(0, roundBased ? 5 : 10)
            return (
              <div
                key={team.id || 'all'}
                className="border border-line bg-[#0e1218]/85"
                style={{ borderTop: `2px solid ${color}` }}
              >
                <div className="flex items-center justify-between border-b border-line px-4 py-2">
                  <span className="display text-[15px] tracking-[0.1em]" style={{ color }}>
                    {!roundBased
                      ? t('team_all')
                      : team.id === myTeam
                        ? t('team_ally')
                        : t('team_enemy')}
                  </span>
                  {roundBased && (
                    <span className="display text-[17px] tabular-nums">{team.rounds}</span>
                  )}
                </div>
                {players.map((p) => {
                  const tier = tierOf(catalog, p.tier)
                  return (
                    <div
                      key={p.puuid}
                      className={`grid grid-cols-[30px_minmax(0,1fr)_26px_56px_100px] items-center gap-3 px-4 py-[5px] ${p.puuid === puuid ? 'bg-accent/[0.12]' : ''}`}
                    >
                      {agentOf(catalog, p.agent).icon ? (
                        <img
                          src={agentOf(catalog, p.agent).icon as string}
                          alt=""
                          className="h-[30px] w-[30px] border border-line-2 object-cover"
                        />
                      ) : (
                        <span />
                      )}
                      <span className="flex min-w-0 items-center gap-1.5 text-[14px] font-semibold">
                        <span className="truncate">{label(p)}</span>
                        {p.score === top && <Crown size={13} className="shrink-0 text-warn" />}
                      </span>
                      {p.tier > 0 && tier.icon ? (
                        <img src={tier.icon} alt="" className="h-6 w-6" />
                      ) : (
                        <span />
                      )}
                      <span className="display text-end text-[15px] tabular-nums">
                        {roundBased ? acs(p) : p.score}
                      </span>
                      <span className="display text-end text-[15px] tabular-nums text-muted">
                        {p.kills}/{p.deaths}/{p.assists}
                      </span>
                    </div>
                  )
                })}
              </div>
            )
          })}
          <div className="flex justify-end text-[11px] tracking-[0.2em] text-dim">
            <span className="display">VALORANTRPC · {STUDIO}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
