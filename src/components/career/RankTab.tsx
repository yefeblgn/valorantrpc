import { useEffect, useMemo, useRef, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import type { RrEntry } from '@shared/history'
import { useT } from '../../lib/i18n'
import { useStore } from '../../store'
import {
  ALL,
  IMMORTAL_TIER,
  absoluteRr,
  goalProgress,
  rrTimeline,
  type RrPoint
} from '../../lib/career'
import { mapOf, tierOf, useHistoryStore } from '../../lib/history'
import { FadeImg } from '../ui/FadeImg'
import { Select } from '../ui/Select'
import { Empty, Section, StatTile, TileGrid, formatDate, signed, useLocale } from './common'

const HEIGHT = 240
const PAD = { top: 16, right: 16, bottom: 26, left: 92 }
const FIRST_GOAL = 4
const TABLE_ROWS = 15

export function RankTab({ entries, season }: { entries: RrEntry[]; season: string }): JSX.Element {
  const t = useT()
  const catalog = useHistoryStore((s) => s.catalog)
  const goal = useStore((s) => s.settings?.rankGoal ?? 0)
  const snap = useStore((s) => s.snapshot)
  const patch = useStore((s) => s.patch)
  const locale = useLocale()
  const points = useMemo(() => rrTimeline(entries, season), [entries, season])

  const latest = [...entries].sort((a, b) => b.start - a.start)[0]
  const current = latest
    ? { tier: latest.tier, rr: latest.after }
    : { tier: snap?.state.competitiveTier ?? 0, rr: snap?.state.rr ?? 0 }
  const progress = goalProgress(current, goal, entries)
  const currentTier = tierOf(catalog, current.tier)
  const goalOptions = [
    { value: '0', label: t('goal_none') },
    ...Array.from({ length: IMMORTAL_TIER - FIRST_GOAL + 1 }, (_, i) => FIRST_GOAL + i)
      .filter((tier) => tier > current.tier)
      .map((tier) => ({ value: String(tier), label: tierOf(catalog, tier).name || String(tier) }))
  ]
  const goalPct = goal
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round((absoluteRr(current.tier, current.rr) / absoluteRr(goal, 0)) * 100)
        )
      )
    : 0
  const seasonEntries = points.map((p) => p.entry)
  const net = seasonEntries.reduce((s, e) => s + e.change, 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section className="panel ticks flex items-center gap-4 p-5">
          {currentTier.icon && <FadeImg src={currentTier.icon} className="h-16 w-16 shrink-0" />}
          <div className="min-w-0">
            <div className="label">{t('current_rank')}</div>
            <div className="display mt-1 text-[26px]">
              {current.tier ? currentTier.name : t('unranked')}
            </div>
            {current.tier > 0 && <div className="text-[13px] text-muted">{current.rr} RR</div>}
          </div>
        </section>
        <Section
          title={t('rank_goal')}
          right={
            <Select
              value={String(goal)}
              minWidth={170}
              options={goalOptions}
              onChange={(v) => void patch({ rankGoal: Number(v) })}
            />
          }
        >
          {progress ? (
            <div className="flex flex-col gap-3 px-4 py-3.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[13px] text-muted">
                  {t('goal_needed')
                    .replace('{n}', String(progress.needed))
                    .replace('{rank}', tierOf(catalog, goal).name)}
                </span>
                <span className="display text-[15px] tabular-nums">{goalPct}%</span>
              </div>
              <div className="h-[6px] bg-line-2">
                <div className="h-full bg-accent" style={{ width: `${Math.max(goalPct, 2)}%` }} />
              </div>
              <div className="grid grid-cols-3 gap-3 text-[12.5px]">
                <span className="text-muted">
                  {t('avg_gain')}{' '}
                  <span className="display text-[14px] text-good">+{progress.avgGain}</span>
                </span>
                <span className="text-muted">
                  {t('avg_loss')}{' '}
                  <span className="display text-[14px] text-bad">-{progress.avgLoss}</span>
                </span>
                <span className="text-muted">
                  {t('goal_estimate')}{' '}
                  <span className="display text-[14px] text-text">
                    {progress.estimate !== null
                      ? t('matches_n').replace('{n}', String(progress.estimate))
                      : '—'}
                  </span>
                </span>
              </div>
              {progress.estimate === null && (
                <p className="text-[12px] text-dim">{t('goal_no_estimate')}</p>
              )}
            </div>
          ) : (
            <p className="px-4 py-3.5 text-[13px] text-dim">
              {goal ? t('goal_reached') : t('goal_pick')}
            </p>
          )}
        </Section>
      </div>

      {points.length < 2 ? (
        <Empty
          icon={<TrendingUp size={26} />}
          title={t('no_rr_data')}
          desc={t('no_rr_data_desc')}
        />
      ) : (
        <>
          <TileGrid cols={3}>
            <StatTile
              label={t('rr_net')}
              value={signed(net)}
              tone={net > 0 ? 'text-good' : net < 0 ? 'text-bad' : 'text-text'}
              sub={season === ALL ? t('filter_all') : undefined}
            />
            <StatTile label={t('matches')} value={points.length} />
            <StatTile
              label={t('rr_peak')}
              value={tierOf(catalog, Math.max(...seasonEntries.map((e) => e.tier))).name}
            />
          </TileGrid>
          <Section title={t('rr_history')}>
            <RrChart points={points} />
          </Section>
          <Section title={t('rr_recent')}>
            <div className="divide-y divide-line">
              {[...points]
                .reverse()
                .slice(0, TABLE_ROWS)
                .map(({ entry: e }) => {
                  const tier = tierOf(catalog, e.tier)
                  const moved = e.tier !== e.tierBefore
                  return (
                    <div
                      key={e.id}
                      className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-2 text-[12.5px]"
                    >
                      <span className="text-muted">{formatDate(locale, e.start)}</span>
                      <span className="truncate">{mapOf(catalog, e.map).name || '—'}</span>
                      <span className="flex items-center gap-1.5">
                        {tier.icon && <FadeImg src={tier.icon} className="h-5 w-5" />}
                        <span
                          className={
                            moved
                              ? e.tier > e.tierBefore
                                ? 'text-good'
                                : 'text-bad'
                              : 'text-muted'
                          }
                        >
                          {tier.name} · {e.after}
                        </span>
                      </span>
                      <span
                        className={`display w-12 text-end text-[14px] tabular-nums ${e.change > 0 ? 'text-good' : e.change < 0 ? 'text-bad' : 'text-muted'}`}
                      >
                        {signed(e.change)}
                      </span>
                    </div>
                  )
                })}
            </div>
          </Section>
        </>
      )}
    </div>
  )
}

function RrChart({ points }: { points: RrPoint[] }): JSX.Element {
  const t = useT()
  const locale = useLocale()
  const catalog = useHistoryStore((s) => s.catalog)
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(640)
  const [hover, setHover] = useState<number | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(320, entry.contentRect.width))
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const totals = points.map((p) => p.total)
  const min = Math.floor(Math.min(...totals) / 100) * 100
  const max = Math.max(Math.ceil(Math.max(...totals) / 100) * 100, min + 100)
  const plotW = width - PAD.left - PAD.right
  const plotH = HEIGHT - PAD.top - PAD.bottom
  const x = (i: number): number =>
    PAD.left + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW)
  const y = (v: number): number => PAD.top + (1 - (v - min) / (max - min)) * plotH
  const steps = (max - min) / 100
  const every = steps > 8 ? 2 : 1
  const ticks = Array.from({ length: steps + 1 }, (_, i) => min + i * 100).filter(
    (_, i) => i % every === 0
  )
  const line = points
    .map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.total).toFixed(1)}`)
    .join('')
  const area = `${line}L${x(points.length - 1).toFixed(1)} ${PAD.top + plotH}L${x(0).toFixed(1)} ${PAD.top + plotH}Z`
  const last = points.length - 1
  const hovered = hover !== null ? points[hover] : null

  const onMove = (e: React.PointerEvent<SVGSVGElement>): void => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * width
    const ratio = (px - PAD.left) / Math.max(plotW, 1)
    setHover(Math.max(0, Math.min(last, Math.round(ratio * last))))
  }

  return (
    <div ref={ref} className="relative px-2 py-3" dir="ltr">
      <svg
        width="100%"
        height={HEIGHT}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={t('rr_history')}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={y(v)}
              y2={y(v)}
              stroke="var(--color-line)"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={y(v) + 4}
              textAnchor="end"
              fontSize={11}
              fill="var(--color-dim)"
            >
              {tierOf(catalog, Math.min(v / 100 + 3, IMMORTAL_TIER)).name || v}
            </text>
          </g>
        ))}
        <path d={area} fill="var(--accent)" fillOpacity={0.1} />
        <path
          d={line}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => {
          if (!i || p.entry.tier === p.entry.tierBefore) return null
          const up = p.entry.tier > p.entry.tierBefore
          const cx = x(i)
          const cy = y(p.total)
          return (
            <path
              key={p.entry.id}
              d={up ? `M${cx} ${cy - 11}l5 7h-10z` : `M${cx} ${cy + 11}l5 -7h-10z`}
              fill={up ? 'var(--color-good)' : 'var(--color-bad)'}
            />
          )
        })}
        <text x={PAD.left} y={HEIGHT - 6} fontSize={11} fill="var(--color-dim)">
          {formatDate(locale, points[0].entry.start, false)}
        </text>
        <text
          x={width - PAD.right}
          y={HEIGHT - 6}
          textAnchor="end"
          fontSize={11}
          fill="var(--color-dim)"
        >
          {formatDate(locale, points[last].entry.start, false)}
        </text>
        {hover !== null && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={PAD.top}
            y2={PAD.top + plotH}
            stroke="var(--color-muted)"
            strokeWidth={1}
          />
        )}
        <circle
          cx={x(hover ?? last)}
          cy={y(points[hover ?? last].total)}
          r={4.5}
          fill="var(--accent)"
          stroke="var(--color-panel)"
          strokeWidth={2}
        />
      </svg>
      {hovered && (
        <div
          className="tip pointer-events-none absolute top-2 min-w-[150px]"
          style={{
            left: Math.min(Math.max((x(hover as number) / width) * 100, 8), 80) + '%',
            transform: 'translateX(-50%)'
          }}
        >
          <div className="display text-[16px] tabular-nums">
            <span
              className={
                hovered.entry.change > 0
                  ? 'text-good'
                  : hovered.entry.change < 0
                    ? 'text-bad'
                    : 'text-text'
              }
            >
              {signed(hovered.entry.change)} RR
            </span>
          </div>
          <div className="mt-0.5 text-[12px] text-muted">
            {tierOf(catalog, hovered.entry.tier).name} · {hovered.entry.after} RR
          </div>
          <div className="text-[11.5px] text-dim">
            {mapOf(catalog, hovered.entry.map).name} · {formatDate(locale, hovered.entry.start)}
          </div>
        </div>
      )}
    </div>
  )
}
