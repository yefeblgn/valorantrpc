import type { ReactNode } from 'react'
import type { MatchResult, WL } from '@shared/history'
import { apiLanguage } from '@shared/i18n'
import { useStore } from '../../store'
import { useT } from '../../lib/i18n'
import { agentOf, useHistoryStore } from '../../lib/history'
import { FadeImg } from '../ui/FadeImg'
import { Tip } from '../ui/Tip'

export const RESULT_COLOR: Record<MatchResult, string> = {
  win: 'var(--color-good)',
  loss: 'var(--color-bad)',
  draw: 'var(--color-muted)'
}

export function useLocale(): string {
  const language = useStore((s) => s.settings?.language ?? 'en')
  return apiLanguage(language)
}

export function formatNumber(locale: string, value: number, digits = 0): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value)
}

export function formatDate(locale: string, ms: number, withTime = true): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: new Date(ms).getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {})
  }).format(ms)
}

export function formatTime(locale: string, ms: number): string {
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(ms)
}

export function dayLabel(locale: string, ms: number, t: (k: string) => string): string {
  const day = new Date(ms)
  const today = new Date()
  const diff = Math.round(
    (new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() -
      new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime()) /
      86_400_000
  )
  if (diff === 0) return t('today')
  if (diff === 1) return t('yesterday')
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(ms)
}

const LRM = '\u200e'

export function signed(n: number): string {
  return `${LRM}${n > 0 ? '+' : ''}${n}`
}

export function rateTone(rate: number, good = 55, bad = 45): string {
  return rate >= good ? 'text-good' : rate < bad ? 'text-bad' : 'text-text'
}

export function AgentIcon({
  uuid,
  size = 32,
  className = ''
}: {
  uuid: string
  size?: number
  className?: string
}): JSX.Element {
  const catalog = useHistoryStore((s) => s.catalog)
  const agent = agentOf(catalog, uuid)
  return (
    <span
      className={`block shrink-0 overflow-hidden border border-line-2 bg-panel-2 ${className}`}
      style={{ width: size, height: size }}
    >
      {agent.icon && <FadeImg src={agent.icon} className="h-full w-full object-cover" />}
    </span>
  )
}

export function StatTile({
  label,
  value,
  sub,
  tone = 'text-text',
  hint
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: string
  hint?: string
}): JSX.Element {
  const body = (
    <div className="min-w-0 bg-panel px-4 py-3">
      <div className="label truncate">{label}</div>
      <div className={`display mt-1 truncate text-[22px] tabular-nums ${tone}`}>{value}</div>
      {sub && <div className="mt-0.5 truncate text-[11.5px] text-dim">{sub}</div>}
    </div>
  )
  return hint ? (
    <Tip label={label} desc={hint} side="top">
      {body}
    </Tip>
  ) : (
    body
  )
}

const TILE_COLS = {
  3: 'grid-cols-3',
  4: 'grid-cols-2 @3xl:grid-cols-4',
  6: 'grid-cols-2 @2xl:grid-cols-3 @4xl:grid-cols-6'
}

export function TileGrid({
  children,
  cols = 6
}: {
  children: ReactNode
  cols?: keyof typeof TILE_COLS
}): JSX.Element {
  return (
    <div className={`grid gap-px border border-line bg-line ${TILE_COLS[cols]}`}>{children}</div>
  )
}

export function RateBar({
  value,
  label,
  wide = false
}: {
  value: WL
  label?: string
  wide?: boolean
}): JSX.Element {
  const t = useT()
  const rate = value[0] ? Math.round((value[1] / value[0]) * 100) : 0
  return (
    <div className={`flex items-center gap-2.5 ${wide ? 'w-full' : ''}`}>
      <div className={`h-[4px] shrink-0 bg-bad/30 ${wide ? 'flex-1' : 'w-20'}`}>
        <div className="h-full bg-good" style={{ width: `${value[0] ? rate : 0}%` }} />
      </div>
      <span
        className={`display w-11 shrink-0 text-end text-[14px] tabular-nums ${value[0] ? rateTone(rate) : 'text-dim'}`}
      >
        {value[0] ? t('pct').replace('{n}', String(rate)) : '—'}
      </span>
      <span className="w-16 shrink-0 text-[11.5px] tabular-nums text-dim">
        {label ?? `${value[1]}/${value[0]}`}
      </span>
    </div>
  )
}

export function Section({
  title,
  right,
  children,
  className = ''
}: {
  title: string
  right?: ReactNode
  children: ReactNode
  className?: string
}): JSX.Element {
  return (
    <section className={`panel min-w-0 ${className}`}>
      <header className="flex min-h-11 items-center justify-between gap-3 border-b border-line px-4 py-2">
        <span className="label text-muted">{title}</span>
        {right}
      </header>
      {children}
    </section>
  )
}

export function Empty({
  icon,
  title,
  desc,
  action
}: {
  icon: ReactNode
  title: string
  desc?: string
  action?: ReactNode
}): JSX.Element {
  return (
    <div className="panel flex items-center gap-4 border-dashed px-5 py-6">
      <span className="shrink-0 text-dim">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="display text-[19px] tracking-[0.05em]">{title}</div>
        {desc && <p className="mt-1 text-[13px] leading-snug text-muted">{desc}</p>}
      </div>
      {action}
    </div>
  )
}
