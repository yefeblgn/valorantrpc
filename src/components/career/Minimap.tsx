import { useEffect, useMemo, useState } from 'react'
import { Bomb, Users } from 'lucide-react'
import type { CatalogMap, HistoryKill, MatchDetail, MatchSummary, Point } from '@shared/history'
import { useT } from '../../lib/i18n'
import { agentOf, killMethod, useHistoryStore } from '../../lib/history'
import { Segmented } from '../ui/Segmented'
import { FadeImg } from '../ui/FadeImg'

const ALLY = 'var(--color-ally)'
const ENEMY = '#ff4655'
const SPIKE = '#f5b042'
const MAX_MAP_MATCHES = 20

type Layer = 'mine' | 'deaths' | 'all' | 'spike'
type Scope = 'match' | 'map'

interface Actor {
  name: string
  icon: string | null
  color: string
  self: boolean
}

interface Marker {
  key: string
  at: Point
  from: Point | null
  color: string
  shape: 'dot' | 'cross' | 'diamond'
  round: number
  time: number
  actor: Actor
  target: Actor | null
  how: { name: string; icon: string | null } | null
  site: string
}

function clock(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function project(map: CatalogMap, p: Point): Point {
  return { x: p.y * map.xMul + map.xAdd, y: p.x * map.yMul + map.yAdd }
}

export function Minimap({
  detail,
  map,
  me,
  round,
  sameMap
}: {
  detail: MatchDetail
  map: CatalogMap
  me: number
  round: number | null
  sameMap: MatchSummary[]
}): JSX.Element {
  const t = useT()
  const catalog = useHistoryStore((s) => s.catalog)
  const [layer, setLayer] = useState<Layer>('mine')
  const [scope, setScope] = useState<Scope>('match')
  const [others, setOthers] = useState<MatchDetail[] | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const myPuuid = detail.players[me]?.puuid ?? ''

  useEffect(() => {
    if (scope !== 'map' || others) return
    let cancelled = false
    void (async () => {
      const list: MatchDetail[] = []
      for (const m of sameMap.slice(0, MAX_MAP_MATCHES)) {
        const d = m.id === detail.id ? detail : await window.api.getMatchDetail(m.id)
        if (cancelled) return
        if (d) list.push(d)
      }
      setOthers(list)
    })()
    return () => {
      cancelled = true
    }
  }, [scope, others, sameMap, detail])

  const markers = useMemo(() => {
    const sources = scope === 'map' ? (others ?? []) : [detail]
    const out: Marker[] = []
    for (const d of sources) {
      const meIndex = d.players.findIndex((p) => p.puuid === myPuuid)
      const myTeam = d.players[meIndex]?.team ?? ''
      const actor = (i: number): Actor => {
        const p = d.players[i]
        const agent = p ? agentOf(catalog, p.agent) : null
        return {
          name: p ? p.name || agent?.name || '?' : '?',
          icon: agent?.icon ?? null,
          color: p?.team === myTeam ? ALLY : ENEMY,
          self: i === meIndex
        }
      }
      for (const r of d.rounds) {
        if (scope === 'match' && round !== null && r.n !== round) continue
        if (layer === 'spike') {
          if (r.plant?.at) {
            out.push({
              key: `${d.id}-${r.n}-plant`,
              at: project(map, r.plant.at),
              from: null,
              color: SPIKE,
              shape: 'diamond',
              round: r.n,
              time: r.plant.t,
              actor: actor(r.plant.by),
              target: null,
              how: null,
              site: r.plant.site
            })
          }
          continue
        }
        r.kills.forEach((k: HistoryKill, i) => {
          if (!k.victimAt) return
          const mine = k.killer === meIndex
          const died = k.victim === meIndex
          if (layer === 'mine' && !mine) return
          if (layer === 'deaths' && !died) return
          const killerTeam = d.players[k.killer]?.team
          out.push({
            key: `${d.id}-${r.n}-${i}`,
            at: project(map, k.victimAt),
            from: k.killerAt && scope === 'match' ? project(map, k.killerAt) : null,
            color: killerTeam === myTeam ? ALLY : ENEMY,
            shape: died ? 'cross' : 'dot',
            round: r.n,
            time: k.t,
            actor: actor(k.killer),
            target: actor(k.victim),
            how: killMethod(catalog, k, d.players[k.killer]?.agent ?? null, t),
            site: ''
          })
        })
      }
    }
    return out
  }, [scope, others, detail, round, layer, map, myPuuid, catalog, t])

  const loading = scope === 'map' && !others
  const active = markers.find((m) => m.key === hover) ?? null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented<Layer>
          value={layer}
          onChange={setLayer}
          options={[
            { value: 'mine', label: t('map_my_kills') },
            { value: 'deaths', label: t('map_my_deaths') },
            { value: 'all', label: t('map_all_kills') },
            { value: 'spike', label: t('map_spike') }
          ]}
        />
        <Segmented<Scope>
          value={scope}
          onChange={setScope}
          options={[
            { value: 'match', label: t('map_this_match') },
            {
              value: 'map',
              label: t('map_last_n').replace(
                '{n}',
                String(Math.min(sameMap.length, MAX_MAP_MATCHES))
              )
            }
          ]}
        />
        <span className="text-[12px] text-dim">
          {loading ? t('loading') : t('map_markers').replace('{n}', String(markers.length))}
        </span>
      </div>
      {!map.minimap ? (
        <div className="panel px-5 py-6 text-[13px] text-dim">{t('map_unavailable')}</div>
      ) : (
        <div className="panel relative mx-auto aspect-square w-full max-w-[560px] bg-[#0b0e13]">
          <FadeImg
            src={map.minimap}
            className="absolute inset-0 h-full w-full object-contain opacity-80"
          />
          <svg
            viewBox="0 0 1 1"
            className="absolute inset-0 h-full w-full"
            onPointerLeave={() => setHover(null)}
          >
            {markers.map((m) => (
              <g
                key={m.key}
                className="cursor-pointer"
                opacity={active && active.key !== m.key ? 0.45 : 1}
                onPointerEnter={() => setHover(m.key)}
              >
                {m.from && (
                  <line
                    x1={m.from.x}
                    y1={m.from.y}
                    x2={m.at.x}
                    y2={m.at.y}
                    stroke={m.color}
                    strokeOpacity={active?.key === m.key ? 0.9 : 0.45}
                    strokeWidth={active?.key === m.key ? 0.004 : 0.0025}
                  />
                )}
                <circle cx={m.at.x} cy={m.at.y} r={0.022} fill="transparent" />
                {active?.key === m.key && (
                  <circle
                    cx={m.at.x}
                    cy={m.at.y}
                    r={0.017}
                    fill="none"
                    stroke={m.color}
                    strokeWidth={0.003}
                  />
                )}
                {m.shape === 'dot' && (
                  <circle
                    cx={m.at.x}
                    cy={m.at.y}
                    r={0.009}
                    fill={m.color}
                    stroke="#0b0e13"
                    strokeWidth={0.003}
                  />
                )}
                {m.shape === 'cross' && (
                  <path
                    d={`M${m.at.x - 0.009} ${m.at.y - 0.009}L${m.at.x + 0.009} ${m.at.y + 0.009}M${m.at.x + 0.009} ${m.at.y - 0.009}L${m.at.x - 0.009} ${m.at.y + 0.009}`}
                    stroke={m.color}
                    strokeWidth={0.005}
                    strokeLinecap="round"
                  />
                )}
                {m.shape === 'diamond' && (
                  <rect
                    x={m.at.x - 0.009}
                    y={m.at.y - 0.009}
                    width={0.018}
                    height={0.018}
                    transform={`rotate(45 ${m.at.x} ${m.at.y})`}
                    fill={m.color}
                    stroke="#0b0e13"
                    strokeWidth={0.003}
                  />
                )}
              </g>
            ))}
          </svg>
          {active && <MarkerCard key={active.key} marker={active} />}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-center gap-4 text-[12px] text-muted">
        <Legend color={ALLY} label={t('legend_ally_kill')} />
        <Legend color={ENEMY} label={t('legend_enemy_kill')} />
        <Legend color={SPIKE} label={t('map_spike')} />
      </div>
    </div>
  )
}

function MarkerCard({ marker }: { marker: Marker }): JSX.Element {
  const t = useT()
  const { at } = marker
  const below = at.y < 0.24
  const x = at.x < 0.25 ? '-18px' : at.x > 0.75 ? 'calc(-100% + 18px)' : '-50%'
  const y = below ? '20px' : 'calc(-100% - 20px)'

  return (
    <div
      className="pointer-events-none absolute z-10"
      style={{ left: `${at.x * 100}%`, top: `${at.y * 100}%`, transform: `translate(${x}, ${y})` }}
    >
      <div
        className="animate-[page-in_0.16s_cubic-bezier(0.22,1,0.36,1)] border border-line-2 bg-panel-2 shadow-[0_14px_32px_-12px_rgba(0,0,0,0.85)]"
        style={{ borderInlineStart: `2px solid ${marker.color}` }}
      >
        <div className="flex items-center gap-2 border-b border-line px-3 py-1.5">
          <span className="display text-[11.5px] tracking-[0.14em] text-muted">
            {t('round_n').replace('{n}', String(marker.round + 1))}
          </span>
          <span className="text-[11.5px] tabular-nums text-dim">{clock(marker.time)}</span>
        </div>
        <div className="flex items-center gap-3 whitespace-nowrap px-3 py-2.5">
          <ActorChip actor={marker.actor} />
          {marker.target ? (
            <>
              <span className="flex min-w-[44px] flex-col items-center gap-1">
                {marker.how?.icon ? (
                  <FadeImg
                    src={marker.how.icon}
                    className="h-[18px] max-w-[84px] object-contain opacity-90 rtl:-scale-x-100 [[data-theme=light]_&]:invert"
                  />
                ) : (
                  <span className="display text-[11px] tracking-[0.08em] text-muted">
                    {marker.how?.name ?? '—'}
                  </span>
                )}
                {marker.how?.icon && (
                  <span className="max-w-[96px] truncate text-[10.5px] text-dim">
                    {marker.how.name}
                  </span>
                )}
              </span>
              <ActorChip actor={marker.target} />
            </>
          ) : (
            <span className="flex items-center gap-2">
              <Bomb size={15} className="text-warn" />
              <span className="display text-[13px] tracking-[0.1em] text-text">
                {t('spike_planted')}
              </span>
              {marker.site && (
                <span className="display border border-warn/50 bg-warn/10 px-1.5 text-[12px] tracking-[0.1em] text-warn">
                  {marker.site}
                </span>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function ActorChip({ actor }: { actor: Actor }): JSX.Element {
  return (
    <span className="flex items-center gap-2">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden bg-panel"
        style={{ boxShadow: `inset 0 -2px 0 ${actor.color}` }}
      >
        {actor.icon ? (
          <FadeImg src={actor.icon} className="h-full w-full object-cover" />
        ) : (
          <Users size={14} className="text-dim" />
        )}
      </span>
      <span
        className={`max-w-[130px] truncate text-[13px] ${actor.self ? 'font-bold' : 'font-semibold'}`}
        style={{ color: actor.color }}
      >
        {actor.name}
      </span>
    </span>
  )
}

function Legend({ color, label }: { color: string; label: string }): JSX.Element {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}
