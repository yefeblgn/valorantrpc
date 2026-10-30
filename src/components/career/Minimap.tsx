import { useEffect, useMemo, useState } from 'react'
import type { CatalogMap, HistoryKill, MatchDetail, MatchSummary, Point } from '@shared/history'
import { useT } from '../../lib/i18n'
import { agentOf, useHistoryStore } from '../../lib/history'
import { Segmented } from '../ui/Segmented'
import { FadeImg } from '../ui/FadeImg'

const ALLY = 'var(--color-ally)'
const ENEMY = '#ff4655'
const SPIKE = '#f5b042'
const MAX_MAP_MATCHES = 20

type Layer = 'mine' | 'deaths' | 'all' | 'spike'
type Scope = 'match' | 'map'

interface Marker {
  key: string
  at: Point
  from: Point | null
  color: string
  shape: 'dot' | 'cross' | 'diamond'
  label: string
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
      const name = (i: number): string => {
        const p = d.players[i]
        return p ? p.name || agentOf(catalog, p.agent).name : '?'
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
              label: `${t('round_n').replace('{n}', String(r.n + 1))} · ${t('spike_planted')} ${r.plant.site} · ${name(r.plant.by)}`
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
            label: `${t('round_n').replace('{n}', String(r.n + 1))} · ${name(k.killer)} → ${name(k.victim)}`
          })
        })
      }
    }
    return out
  }, [scope, others, detail, round, layer, map, myPuuid, catalog, t])

  const loading = scope === 'map' && !others

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
        <div className="panel relative mx-auto aspect-square w-full max-w-[560px] overflow-hidden bg-[#0b0e13]">
          <FadeImg
            src={map.minimap}
            className="absolute inset-0 h-full w-full object-contain opacity-80"
          />
          <svg viewBox="0 0 1 1" className="absolute inset-0 h-full w-full">
            {markers.map((m) => (
              <g key={m.key}>
                <title>{m.label}</title>
                {m.from && (
                  <line
                    x1={m.from.x}
                    y1={m.from.y}
                    x2={m.at.x}
                    y2={m.at.y}
                    stroke={m.color}
                    strokeOpacity={0.45}
                    strokeWidth={0.0025}
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

function Legend({ color, label }: { color: string; label: string }): JSX.Element {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}
