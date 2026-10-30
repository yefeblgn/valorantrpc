import { Fragment, useMemo, useState } from 'react'
import { ChevronDown, Crown } from 'lucide-react'
import type { MatchSummary } from '@shared/history'
import { acs, pct, ratio } from '@shared/history'
import { useT } from '../../lib/i18n'
import { agentOf, mapOf, modeOf, tierOf, useHistoryStore } from '../../lib/history'
import { FadeImg } from '../ui/FadeImg'
import { Tip } from '../ui/Tip'
import { AgentIcon, RESULT_COLOR, dayLabel, formatTime, signed, useLocale } from './common'

const PAGE = 40
const ROW =
  'grid grid-cols-[4px_132px_minmax(0,1.3fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,0.6fr)_minmax(0,0.6fr)_minmax(0,0.7fr)] items-center gap-x-3'

export function MatchList({
  matches,
  onOpen
}: {
  matches: MatchSummary[]
  onOpen: (id: string) => void
}): JSX.Element {
  const t = useT()
  const locale = useLocale()
  const [limit, setLimit] = useState(PAGE)
  const shown = matches.slice(0, limit)

  const groups = useMemo(() => {
    const out: { key: string; label: string; items: MatchSummary[] }[] = []
    for (const m of shown) {
      const d = new Date(m.start)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      const last = out[out.length - 1]
      if (last?.key === key) last.items.push(m)
      else out.push({ key, label: dayLabel(locale, m.start, t), items: [m] })
    }
    return out
  }, [shown, locale, t])

  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => {
        const wins = g.items.filter((m) => m.result === 'win').length
        const losses = g.items.filter((m) => m.result === 'loss').length
        return (
          <Fragment key={g.key}>
            <div className="flex items-center gap-3">
              <span className="display text-[14px] tracking-[0.1em] text-muted">{g.label}</span>
              <span className="h-px flex-1 bg-line" />
              <span className="display text-[13px] tabular-nums">
                <span className="text-good">
                  {wins}
                  {t('wins_short')}
                </span>{' '}
                <span className="text-bad">
                  {losses}
                  {t('losses_short')}
                </span>
              </span>
            </div>
            <div className="panel divide-y divide-line overflow-hidden">
              {g.items.map((m) => (
                <MatchRow key={m.id} match={m} onOpen={() => onOpen(m.id)} />
              ))}
            </div>
          </Fragment>
        )
      })}
      {matches.length > limit && (
        <button onClick={() => setLimit(limit + PAGE)} className="btn btn-ghost self-center">
          <ChevronDown size={14} />
          {t('show_more')}
        </button>
      )}
    </div>
  )
}

function MatchRow({ match: m, onOpen }: { match: MatchSummary; onOpen: () => void }): JSX.Element {
  const t = useT()
  const locale = useLocale()
  const catalog = useHistoryStore((s) => s.catalog)
  const map = mapOf(catalog, m.map)
  const agent = agentOf(catalog, m.agent)
  const mode = modeOf(catalog, m)
  const tier = tierOf(catalog, m.rr?.tier ?? m.tier)
  const hs = pct(m.head, m.head + m.body + m.leg)
  const kd = ratio(m.kills, m.deaths)

  return (
    <button
      onClick={onOpen}
      className={`${ROW} group w-full py-2 pe-4 text-start transition-colors hover:bg-hover`}
    >
      <span className="h-12 self-stretch" style={{ background: RESULT_COLOR[m.result] }} />
      <span className="relative h-12 overflow-hidden border border-line bg-panel-2">
        {map.list && (
          <FadeImg
            src={map.list}
            className="h-full w-full object-cover opacity-70 transition-opacity group-hover:opacity-90"
          />
        )}
        <span className="display absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-2 pb-1 pt-3 text-[13px] tracking-[0.08em] text-white">
          {map.name || '—'}
        </span>
      </span>
      <span className="flex min-w-0 items-center gap-2.5">
        <AgentIcon uuid={m.agent} size={36} />
        <span className="min-w-0">
          <span className="display block truncate text-[15px] tracking-[0.04em]">
            {agent.name || '—'}
          </span>
          <span className="flex items-center gap-1.5 truncate text-[11.5px] text-dim">
            {mode.name}
            {m.partySize > 1 && <span>· {t('party_of').replace('{n}', String(m.partySize))}</span>}
          </span>
        </span>
      </span>
      <span className="min-w-0">
        <span
          className="display block text-[18px] tabular-nums"
          style={{ color: RESULT_COLOR[m.result] }}
        >
          {m.ally} : {m.enemy}
        </span>
        <span className="flex items-center gap-1 text-[11.5px] text-dim">
          {t(`result_${m.result}`)}
          {m.mvp && (
            <Tip label={t(m.mvp === 'match' ? 'mvp_match' : 'mvp_team')} side="top">
              <Crown
                size={12}
                className={m.mvp === 'match' ? 'text-warn' : 'text-muted'}
                aria-label={t(m.mvp === 'match' ? 'mvp_match' : 'mvp_team')}
              />
            </Tip>
          )}
        </span>
      </span>
      <span className="min-w-0">
        <span className="display block text-[15px] tabular-nums">
          {m.kills} / {m.deaths} / {m.assists}
        </span>
        <span className="text-[11.5px] text-dim">
          {t('col_kd')} {kd.toFixed(2)}
        </span>
      </span>
      <Cell label={t('acs')} value={m.facts ? String(acs(m)) : '—'} />
      <Cell label={t('col_hs')} value={m.facts ? t('pct').replace('{n}', String(hs)) : '—'} />
      <span className="flex min-w-0 items-center justify-end gap-2">
        {m.rr ? (
          <>
            {tier.icon && <FadeImg src={tier.icon} className="h-6 w-6 shrink-0" />}
            <span
              className={`display text-[15px] tabular-nums ${m.rr.change > 0 ? 'text-good' : m.rr.change < 0 ? 'text-bad' : 'text-muted'}`}
            >
              {signed(m.rr.change)}
            </span>
          </>
        ) : (
          <span className="text-[12px] text-dim">{formatTime(locale, m.start)}</span>
        )}
      </span>
    </button>
  )
}

function Cell({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <span className="min-w-0">
      <span className="display block text-[15px] tabular-nums">{value}</span>
      <span className="label text-[10px]">{label}</span>
    </span>
  )
}
