import { useMemo, useState } from 'react'
import { ChevronDown, Users } from 'lucide-react'
import type { MatchSummary } from '@shared/history'
import { useT } from '../../lib/i18n'
import { agentRows, formatDuration, type AgentRow } from '../../lib/career'
import { agentOf, mapOf, useHistoryStore } from '../../lib/history'
import { FadeImg } from '../ui/FadeImg'
import { Tip } from '../ui/Tip'
import { AgentIcon, Empty, RateBar, rateTone, useLocale } from './common'

const COLS =
  'grid grid-cols-[minmax(0,1.7fr)_minmax(0,0.6fr)_minmax(0,1.4fr)_repeat(5,minmax(0,0.6fr))_20px] items-center gap-x-3'

export function AgentsTab({
  matches,
  onAgent
}: {
  matches: MatchSummary[]
  onAgent: (uuid: string) => void
}): JSX.Element {
  const t = useT()
  const rows = useMemo(() => agentRows(matches), [matches])
  const [open, setOpen] = useState<string | null>(null)

  if (!rows.length)
    return (
      <Empty icon={<Users size={26} />} title={t('no_matches')} desc={t('no_matches_filter')} />
    )

  return (
    <section className="panel min-w-0 overflow-hidden">
      <div className={`${COLS} border-b border-line px-4 py-2.5`}>
        <span className="label">{t('agent')}</span>
        <span className="label">{t('matches')}</span>
        <span className="label">{t('win_rate')}</span>
        <span className="label">{t('col_kd')}</span>
        <span className="label">{t('col_kda')}</span>
        <span className="label">{t('acs')}</span>
        <span className="label">ADR</span>
        <span className="label">{t('col_hs')}</span>
        <span />
      </div>
      <div className="divide-y divide-line">
        {rows.map((row) => (
          <AgentLine
            key={row.agent}
            row={row}
            open={open === row.agent}
            onToggle={() => setOpen(open === row.agent ? null : row.agent)}
            onAgent={() => onAgent(row.agent)}
          />
        ))}
      </div>
    </section>
  )
}

function AgentLine({
  row,
  open,
  onToggle,
  onAgent
}: {
  row: AgentRow
  open: boolean
  onToggle: () => void
  onAgent: () => void
}): JSX.Element {
  const t = useT()
  const locale = useLocale()
  const catalog = useHistoryStore((s) => s.catalog)
  const agent = agentOf(catalog, row.agent)
  const d = row.derived
  const tt = row.totals
  const fkRate = tt.rounds ? Math.round((tt.firstKills / tt.rounds) * 100) : 0
  const per = (n: number): string => (tt.matches ? (n / tt.matches).toFixed(1) : '0')

  return (
    <div>
      <button
        onClick={onToggle}
        className={`${COLS} w-full px-4 py-2.5 text-start transition-colors hover:bg-hover`}
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-3">
          <AgentIcon uuid={row.agent} size={38} />
          <span className="min-w-0">
            <span className="display block truncate text-[16px] tracking-[0.04em]">
              {agent.name || '—'}
            </span>
            <span className="block truncate text-[11.5px] text-dim">{agent.role}</span>
          </span>
        </span>
        <span className="display text-[15px] tabular-nums">{tt.matches}</span>
        <RateBar
          value={[tt.matches, tt.wins]}
          label={`${tt.wins}${t('wins_short')} ${tt.losses}${t('losses_short')}`}
        />
        <span
          className={`display text-[15px] tabular-nums ${d.kd >= 1.1 ? 'text-good' : d.kd < 0.9 ? 'text-bad' : ''}`}
        >
          {d.kd.toFixed(2)}
        </span>
        <span className="display text-[15px] tabular-nums">{d.kda.toFixed(2)}</span>
        <span className="display text-[15px] tabular-nums">{d.acs}</span>
        <span className="display text-[15px] tabular-nums">{d.adr}</span>
        <span className="display text-[15px] tabular-nums">{d.hs}%</span>
        <ChevronDown
          size={15}
          className={`text-dim transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="grid grid-cols-1 gap-4 border-t border-line bg-panel-2/40 px-4 py-4 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-px border border-line bg-line">
              <Mini
                label={t('first_kill_rate')}
                value={`${fkRate}%`}
                hint={t('first_kill_rate_desc')}
              />
              <Mini label={t('playtime')} value={formatDuration(tt.playtime, locale)} />
              <Mini label={t('kills_per_match')} value={per(tt.kills)} />
            </div>
            <div>
              <div className="label mb-2">{t('ability_usage')}</div>
              <div className="grid grid-cols-4 gap-px border border-line bg-line">
                {['C', 'Q', 'E', 'X'].map((key, i) => (
                  <Tip
                    key={key}
                    label={agent.abilities[i] || key}
                    desc={t('casts_per_match')}
                    side="top"
                  >
                    <div className="bg-panel px-3 py-2">
                      <div className="label truncate">
                        {key} · {agent.abilities[i] || '—'}
                      </div>
                      <div className="display mt-0.5 text-[17px] tabular-nums">
                        {per(row.casts[i])}
                      </div>
                    </div>
                  </Tip>
                ))}
              </div>
            </div>
            <button onClick={onAgent} className="btn btn-ghost self-start">
              {t('show_agent_matches')}
            </button>
          </div>
          <div>
            <div className="label mb-2">{t('by_map')}</div>
            <div className="flex flex-col gap-1.5">
              {row.maps.map((m) => {
                const map = mapOf(catalog, m.map)
                const rate = Math.round((m.wins / m.matches) * 100)
                return (
                  <div
                    key={m.map}
                    className="grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3"
                  >
                    <span className="relative h-7 overflow-hidden border border-line bg-panel-2">
                      {map.list && (
                        <FadeImg src={map.list} className="h-full w-full object-cover opacity-70" />
                      )}
                    </span>
                    <span className="truncate text-[12.5px]">
                      {map.name || '—'} <span className="text-dim">· {m.matches}</span>
                    </span>
                    <span className={`display text-[14px] tabular-nums ${rateTone(rate)}`}>
                      {rate}%
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Mini({
  label,
  value,
  hint
}: {
  label: string
  value: string
  hint?: string
}): JSX.Element {
  const body = (
    <div className="bg-panel px-3 py-2">
      <div className="label truncate">{label}</div>
      <div className="display mt-0.5 text-[17px] tabular-nums">{value}</div>
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
