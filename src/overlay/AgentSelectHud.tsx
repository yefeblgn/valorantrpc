import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent
} from 'react'
import {
  Check,
  ChevronDown,
  Copy,
  GripVertical,
  Maximize2,
  Minimize2,
  Users,
  X
} from 'lucide-react'
import type { HudLayout, MapAgentStat, MapStats, MatchPlayer, MatchReport } from '@shared/types'
import { AppLogo } from '../components/brand'
import { FadeImg } from '../components/ui/FadeImg'
import { Keys } from '../components/ui/Keys'
import { useT } from '../lib/i18n'

const MAX_ROWS = 5
const WIDTH = 360

function winRate(wins: number, games: number): number {
  return games ? Math.round((wins / games) * 100) : 0
}

function rateTone(rate: number): string {
  return rate >= 55 ? 'text-good' : rate < 45 ? 'text-bad' : 'text-text'
}

export interface HudStage {
  width: number
  height: number
  pointerScale: number
}

export function AgentSelectHud({
  report,
  hotkey,
  layout,
  compact,
  stage,
  onLayout,
  onCompact,
  onClose
}: {
  report: MatchReport
  hotkey: string
  layout: HudLayout
  compact: boolean
  stage: HudStage
  onLayout: (x: number, y: number) => void
  onCompact: (compact: boolean) => void
  onClose?: () => void
}): JSX.Element {
  const t = useT()
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: WIDTH, h: 420 })
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const start = useRef<{ px: number; py: number; left: number; top: number } | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = (): void => setSize({ w: el.offsetWidth, h: el.offsetHeight })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const scaledW = size.w * layout.scale
  const scaledH = size.h * layout.scale
  const freeX = Math.max(stage.width - scaledW, 0)
  const freeY = Math.max(stage.height - scaledH, 0)
  const pos = drag ?? { x: layout.x, y: layout.y }
  const left = pos.x * freeX
  const top = pos.y * freeY

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>): void => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return
    e.currentTarget.setPointerCapture(e.pointerId)
    start.current = { px: e.clientX, py: e.clientY, left, top }
    setDrag({ x: pos.x, y: pos.y })
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLElement>): void => {
    const s = start.current
    if (!s) return
    const nextLeft = s.left + (e.clientX - s.px) / stage.pointerScale
    const nextTop = s.top + (e.clientY - s.py) / stage.pointerScale
    setDrag({
      x: freeX ? Math.min(Math.max(nextLeft / freeX, 0), 1) : 0,
      y: freeY ? Math.min(Math.max(nextTop / freeY, 0), 1) : 0
    })
  }
  const onPointerUp = (): void => {
    if (!start.current) return
    start.current = null
    if (drag) onLayout(Math.round(drag.x * 1000) / 1000, Math.round(drag.y * 1000) / 1000)
    setDrag(null)
  }

  const team = report.teams.find((tm) => tm.ally) ?? report.teams[0]
  const players = (team?.players ?? []).slice(0, MAX_ROWS)

  return (
    <div
      ref={ref}
      data-hud
      className="absolute overflow-hidden border border-line-2 border-t-2 border-t-accent text-text shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)]"
      style={{
        width: WIDTH,
        left,
        top,
        transform: `scale(${layout.scale})`,
        transformOrigin: '0 0',
        background: `rgba(9, 12, 17, ${layout.opacity})`
      }}
    >
      <header
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={`relative h-[68px] touch-none select-none overflow-hidden border-b border-line ${drag ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        {report.mapIcon && (
          <FadeImg
            src={report.mapIcon}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-55"
          />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(9,12,17,0.95)] via-[rgba(9,12,17,0.55)] to-transparent" />
        <div className="absolute end-1.5 top-1.5 flex items-center gap-0.5">
          <HeadButton
            label={t(compact ? 'hud_expand' : 'hud_compact')}
            onClick={() => onCompact(!compact)}
          >
            {compact ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
          </HeadButton>
          {onClose && (
            <HeadButton label={t('hud_close')} onClick={onClose}>
              <X size={13} />
            </HeadButton>
          )}
        </div>
        <div className="relative flex h-full items-end justify-between gap-3 px-3.5 pb-2.5">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <GripVertical size={12} className="text-dim" />
              <AppLogo size={14} />
              <span className="label text-[10.5px] text-muted">{t('phase_pregame')}</span>
            </div>
            <div className="display mt-0.5 truncate text-[22px] leading-none tracking-[0.06em]">
              {report.mapName || '—'}
            </div>
          </div>
          {report.modeName && (
            <span className="flex shrink-0 items-center gap-1.5 pb-0.5">
              {report.modeIcon && (
                <FadeImg src={report.modeIcon} className="h-4 w-4 object-contain opacity-80" />
              )}
              <span className="display text-[12.5px] tracking-[0.12em] text-muted">
                {report.modeName}
              </span>
            </span>
          )}
        </div>
      </header>

      {!compact && (
        <section className="border-b border-line">
          <div className="flex items-center justify-between gap-2 px-3.5 pb-1.5 pt-2.5">
            <span className="label text-[10.5px] text-ally">{t('team_ally')}</span>
            {team?.avgRank && (
              <span className="flex items-center gap-1.5">
                <span className="label text-[10px]">{t('avg_rank')}</span>
                {team.avgRank.icon && <FadeImg src={team.avgRank.icon} className="h-4 w-4" />}
                <span className="display text-[12px]">{team.avgRank.name}</span>
              </span>
            )}
          </div>
          <div className="pb-1.5">
            {players.map((player) => (
              <PlayerLine
                key={player.puuid}
                player={player}
                open={open === player.puuid}
                onToggle={() => setOpen(open === player.puuid ? null : player.puuid)}
              />
            ))}
          </div>
        </section>
      )}

      {report.mapStats && <BestAgents stats={report.mapStats} mapName={report.mapName} />}

      <footer className="flex items-center gap-2 px-3.5 py-2 text-[11.5px] text-dim">
        <Keys value={hotkey} size="sm" />
        <span>{t('hud_tracker')}</span>
      </footer>
    </div>
  )
}

function HeadButton({
  label,
  onClick,
  children
}: {
  label: string
  onClick: () => void
  children: JSX.Element
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-6 w-6 items-center justify-center bg-black/40 text-muted transition-colors hover:bg-black/70 hover:text-text"
    >
      {children}
    </button>
  )
}

function PlayerLine({
  player,
  open,
  onToggle
}: {
  player: MatchPlayer
  open: boolean
  onToggle: () => void
}): JSX.Element {
  const t = useT()
  const [copied, setCopied] = useState(false)
  const stats = player.stats
  const rate = stats?.games ? winRate(stats.wins, stats.games) : null
  const canCopy = !player.hidden && !!player.name

  useEffect(() => {
    if (!copied) return
    const id = setTimeout(() => setCopied(false), 1400)
    return () => clearTimeout(id)
  }, [copied])

  const copy = (): void => {
    window.api.copyText(`${player.name}#${player.tag}`)
    setCopied(true)
  }

  return (
    <div className={player.isSelf ? 'bg-accent/[0.09]' : ''}>
      <div className="group grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2.5 px-3.5 py-[5px] hover:bg-white/[0.04]">
        <button
          onClick={onToggle}
          aria-expanded={open}
          aria-label={t('hud_details')}
          className="contents text-start"
        >
          <span
            className={`flex h-7 w-7 items-center justify-center overflow-hidden border bg-panel-2 ${
              player.locked ? 'border-line-2' : 'border-dashed border-line-2'
            }`}
          >
            {player.agentIcon ? (
              <FadeImg
                src={player.agentIcon}
                className={`h-full w-full object-cover ${player.locked ? '' : 'opacity-50 grayscale'}`}
              />
            ) : (
              <Users size={12} className="text-dim" />
            )}
          </span>
          <span className="min-w-0">
            <span className="flex min-w-0 items-center gap-1">
              {player.hidden ? (
                <span className="truncate text-[12.5px] italic text-muted">
                  {t('hidden_player')}
                </span>
              ) : (
                <span className="truncate text-[12.5px] font-semibold text-text">
                  {player.name || '—'}
                  {player.tag && <span className="font-medium text-dim">#{player.tag}</span>}
                </span>
              )}
              <ChevronDown
                size={11}
                className={`shrink-0 text-dim transition-transform ${open ? 'rotate-180' : ''}`}
              />
            </span>
            <span className="block truncate text-[10.5px] text-dim">
              {player.agentName || (player.locked ? '' : t('picking'))}
            </span>
          </span>
        </button>
        <div className="flex items-center gap-2">
          {player.statsState === 'loading' ? (
            <div className="h-3 w-24 animate-pulse bg-panel-2" />
          ) : !stats ? (
            <span className="text-[11px] italic text-dim">—</span>
          ) : (
            <>
              <span className="flex items-center gap-1.5">
                <span className="h-5 w-5 shrink-0">
                  {stats.rankIcon && (
                    <FadeImg src={stats.rankIcon} className="h-full w-full object-contain" />
                  )}
                </span>
                <span className="display w-[74px] truncate text-[12px] tracking-[0.03em]">
                  {stats.rankTier ? stats.rankName : t('unranked')}
                </span>
              </span>
              <span
                className={`display w-9 text-end text-[12.5px] tabular-nums ${rate === null ? 'text-dim' : rateTone(rate)}`}
              >
                {rate === null ? '—' : t('pct').replace('{n}', String(rate))}
              </span>
              <span className="display w-8 text-end text-[12.5px] tabular-nums text-muted">
                {stats.kd === null ? '—' : stats.kd.toFixed(2)}
              </span>
            </>
          )}
        </div>
      </div>
      {open && (
        <div className="grid grid-cols-3 gap-px border-y border-line bg-line text-[11px]">
          <Detail
            label={t('col_peak')}
            value={stats?.peakTier ? stats.peakName : '—'}
            sub={stats?.peakAct}
            icon={stats?.peakTier ? stats.peakIcon : null}
          />
          <Detail
            label={t('col_season')}
            value={
              stats?.games
                ? `${stats.wins}${t('wins_short')} ${Math.max(stats.games - stats.wins, 0)}${t('losses_short')}`
                : '—'
            }
            sub={stats?.rr !== null && stats?.rr !== undefined ? `${stats.rr} RR` : undefined}
          />
          <Detail
            label={t('col_kda')}
            value={stats?.kda !== null && stats?.kda !== undefined ? stats.kda.toFixed(2) : '—'}
            sub={
              stats?.hs !== null && stats?.hs !== undefined
                ? `HS ${t('pct').replace('{n}', String(stats.hs))}`
                : undefined
            }
          />
          <Detail label={t('level')} value={player.level !== null ? String(player.level) : '—'} />
          <Detail
            label={t('in_party')}
            value={player.isSelf ? t('you') : player.inParty ? t('yes') : t('no')}
          />
          <Detail
            label={t('hud_sample_size')}
            value={stats ? String(stats.sample) : '—'}
            sub={t('hud_recent_comp')}
          />
        </div>
      )}
      {open && canCopy && (
        <button
          onClick={copy}
          className={`flex w-full items-center justify-center gap-1.5 border-b border-line py-1.5 text-[11.5px] transition-colors hover:bg-white/[0.06] ${copied ? 'text-good' : 'text-muted hover:text-text'}`}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? t('copied') : t('copy_name')}
        </button>
      )}
    </div>
  )
}

function Detail({
  label,
  value,
  sub,
  icon
}: {
  label: string
  value: string
  sub?: string
  icon?: string | null
}): JSX.Element {
  return (
    <div className="min-w-0 bg-[rgba(9,12,17,0.92)] px-2.5 py-1.5">
      <div className="label truncate text-[9.5px]">{label}</div>
      <div className="flex min-w-0 items-center gap-1">
        {icon && <FadeImg src={icon} className="h-4 w-4 shrink-0" />}
        <span className="display truncate text-[12.5px]">{value}</span>
      </div>
      {sub && <div className="truncate text-[10px] text-dim">{sub}</div>}
    </div>
  )
}

function BestAgents({ stats, mapName }: { stats: MapStats; mapName: string }): JSX.Element {
  const t = useT()
  const title = mapName ? t('hud_best_on').replace('{map}', mapName) : t('hud_best')

  return (
    <section className="border-b border-line px-3.5 pb-2.5 pt-2.5">
      <div className="label mb-2 text-[10.5px] text-accent">{title}</div>
      {stats.agents.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {stats.agents.map((agent) => (
            <AgentLine key={agent.uuid} agent={agent} />
          ))}
        </div>
      ) : stats.state === 'syncing' ? (
        <div className="flex flex-col gap-1.5">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-7 animate-pulse bg-panel-2/70" />
          ))}
          <div className="mt-0.5 text-[11px] text-dim">{t('hud_syncing')}</div>
        </div>
      ) : (
        <div className="text-[11.5px] text-dim">{t('hud_no_games')}</div>
      )}
      {stats.agents.length > 0 && stats.sample > 0 && (
        <div className="mt-2 text-[10.5px] text-dim">
          {t('hud_sample').replace('{n}', String(stats.sample))}
        </div>
      )}
    </section>
  )
}

function AgentLine({ agent }: { agent: MapAgentStat }): JSX.Element {
  const t = useT()
  const rate = winRate(agent.wins, agent.games)
  const games = t(agent.games === 1 ? 'hud_games_one' : 'hud_games').replace(
    '{n}',
    String(agent.games)
  )

  return (
    <div className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2.5">
      <div className="h-7 w-7 overflow-hidden border border-line-2 bg-panel-2">
        {agent.icon && <FadeImg src={agent.icon} className="h-full w-full object-cover" />}
      </div>
      <div className="min-w-0">
        <div className="display truncate text-[13.5px] leading-tight tracking-[0.04em]">
          {agent.name || '—'}
        </div>
        <div className="text-[10.5px] text-dim">{games}</div>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-[3px] w-14 bg-bad/35">
          <div className="h-full bg-good" style={{ width: `${rate}%` }} />
        </div>
        <span className={`display w-10 text-end text-[14px] tabular-nums ${rateTone(rate)}`}>
          {t('pct').replace('{n}', String(rate))}
        </span>
      </div>
    </div>
  )
}
