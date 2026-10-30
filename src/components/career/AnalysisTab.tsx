import { useMemo } from 'react'
import { BarChart3 } from 'lucide-react'
import type { MatchSummary } from '@shared/history'
import { pct } from '@shared/history'
import { useT } from '../../lib/i18n'
import { analysisOf, firstBloodBy, recordsOf, wlRate } from '../../lib/career'
import { agentOf, mapOf, useHistoryStore } from '../../lib/history'
import { Tip } from '../ui/Tip'
import {
  AgentIcon,
  Empty,
  RateBar,
  Section,
  StatTile,
  TileGrid,
  formatDate,
  rateTone,
  useLocale
} from './common'

export function AnalysisTab({
  matches,
  onOpen
}: {
  matches: MatchSummary[]
  onOpen: (id: string) => void
}): JSX.Element {
  const t = useT()
  const locale = useLocale()
  const catalog = useHistoryStore((s) => s.catalog)
  const withFacts = useMemo(() => matches.filter((m) => m.facts), [matches])
  const a = useMemo(() => analysisOf(withFacts), [withFacts])
  const byMap = useMemo(() => firstBloodBy(withFacts, (m) => m.map), [withFacts])
  const records = useMemo(() => recordsOf(matches, locale), [matches, locale])

  if (!withFacts.length) {
    return (
      <Empty
        icon={<BarChart3 size={26} />}
        title={t('no_round_data')}
        desc={t('no_matches_filter')}
      />
    )
  }

  const fk = a.firstKill[0]
  const fd = a.firstDeath[0]
  const entry = pct(fk, fk + fd)
  const clutchTotal = a.clutches.reduce<[number, number]>(
    (s, c) => [s[0] + c[0], s[1] + c[1]],
    [0, 0]
  )

  return (
    <div className="flex flex-col gap-4">
      <TileGrid>
        <StatTile label={t('rounds')} value={a.rounds} />
        <StatTile
          label={t('entry_success')}
          value={`${entry}%`}
          tone={rateTone(entry, 55, 45)}
          sub={`${fk} FK · ${fd} FD`}
          hint={t('entry_success_desc')}
        />
        <StatTile
          label={t('first_kill_rate')}
          value={`${pct(fk, a.rounds)}%`}
          hint={t('first_kill_rate_desc')}
        />
        <StatTile
          label={t('clutches')}
          value={`${clutchTotal[1]}/${clutchTotal[0]}`}
          sub={clutchTotal[0] ? `${wlRate(clutchTotal)}%` : undefined}
          hint={t('clutch_desc')}
        />
        <StatTile label={t('plants')} value={a.plants} />
        <StatTile label={t('defuses')} value={a.defuses} />
      </TileGrid>

      <div className="grid grid-cols-1 gap-4 @3xl:grid-cols-2">
        <Section title={t('economy')}>
          <div className="flex flex-col gap-3 px-4 py-3.5">
            <Row label={t('econ_pistol')} hint={t('econ_pistol_desc')}>
              <RateBar value={a.pistol} wide />
            </Row>
            <Row label={t('econ_eco')} hint={t('econ_eco_desc')}>
              <RateBar value={a.eco} wide />
            </Row>
            <Row label={t('econ_force')} hint={t('econ_force_desc')}>
              <RateBar value={a.force} wide />
            </Row>
            <Row label={t('econ_full')} hint={t('econ_full_desc')}>
              <RateBar value={a.full} wide />
            </Row>
          </div>
        </Section>

        <Section title={t('sides')}>
          <div className="flex flex-col gap-3 px-4 py-3.5">
            <Row label={t('side_attack')}>
              <RateBar value={a.attack} wide />
            </Row>
            <Row label={t('side_defense')}>
              <RateBar value={a.defense} wide />
            </Row>
            <div className="mt-1 border-t border-line pt-3">
              <Row label={t('after_first_kill')} hint={t('after_first_kill_desc')}>
                <RateBar value={a.firstKill} wide />
              </Row>
            </div>
            <Row label={t('after_first_death')} hint={t('after_first_death_desc')}>
              <RateBar value={a.firstDeath} wide />
            </Row>
          </div>
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-4 @3xl:grid-cols-2">
        <Section title={t('first_blood_by_map')}>
          <div className="divide-y divide-line">
            {byMap.map((row) => {
              const total = row.firstKill[0] + row.firstDeath[0]
              const rate = pct(row.firstKill[0], total)
              return (
                <div
                  key={row.key}
                  className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-2"
                >
                  <span className="truncate text-[13px]">
                    {mapOf(catalog, row.key).name || '—'}
                  </span>
                  <span className="text-[11.5px] tabular-nums text-dim">
                    {row.firstKill[0]} FK · {row.firstDeath[0]} FD
                  </span>
                  <span
                    className={`display w-12 text-end text-[14px] tabular-nums ${total ? rateTone(rate) : 'text-dim'}`}
                  >
                    {total ? `${rate}%` : '—'}
                  </span>
                </div>
              )
            })}
          </div>
        </Section>

        <Section title={t('clutches')}>
          <div className="flex flex-col gap-3 px-4 py-3.5">
            {a.clutches.map((c, i) => (
              <Row key={i} label={`1v${i + 1}`}>
                <RateBar value={c} wide />
              </Row>
            ))}
          </div>
        </Section>
      </div>

      <Section title={t('records')}>
        <div className="grid grid-cols-1 divide-y divide-line @2xl:grid-cols-3 @2xl:divide-y-0">
          {records.map((r) => (
            <button
              key={r.key}
              disabled={!r.match}
              onClick={() => r.match && onOpen(r.match.id)}
              className="flex items-center gap-3 border-line px-4 py-3 text-start transition-colors enabled:hover:bg-hover @2xl:border-b"
            >
              {r.match ? (
                <AgentIcon uuid={r.match.agent} size={34} />
              ) : (
                <span className="h-[34px] w-[34px] shrink-0 border border-dashed border-line-2" />
              )}
              <span className="min-w-0 flex-1">
                <span className="label block truncate">{t(r.key)}</span>
                <span className="block truncate text-[11.5px] text-dim">
                  {r.match
                    ? `${agentOf(catalog, r.match.agent).name} · ${mapOf(catalog, r.match.map).name} · ${formatDate(locale, r.match.start, false)}`
                    : '—'}
                </span>
              </span>
              <span className="display shrink-0 text-[22px] tabular-nums">{r.display}</span>
            </button>
          ))}
        </div>
      </Section>
      <p className="text-[12px] leading-snug text-dim">{t('econ_note')}</p>
    </div>
  )
}

function Row({
  label,
  hint,
  children
}: {
  label: string
  hint?: string
  children: JSX.Element
}): JSX.Element {
  const head = (
    <span className={`text-[13px] text-muted ${hint ? 'cursor-help' : ''}`}>{label}</span>
  )
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-3">
      {hint ? (
        <Tip label={label} desc={hint} side="top">
          {head}
        </Tip>
      ) : (
        head
      )}
      {children}
    </div>
  )
}
