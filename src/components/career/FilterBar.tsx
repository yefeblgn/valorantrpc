import { useMemo } from 'react'
import type { MatchSummary } from '@shared/history'
import { useT } from '../../lib/i18n'
import { ALL, type CareerFilter } from '../../lib/career'
import { agentOf, mapOf, modeOf, seasonLabel, useHistoryStore } from '../../lib/history'
import { Select, type Option } from '../ui/Select'

export function FilterBar({
  matches,
  value,
  onChange
}: {
  matches: MatchSummary[]
  value: CareerFilter
  onChange: (f: CareerFilter) => void
}): JSX.Element {
  const t = useT()
  const catalog = useHistoryStore((s) => s.catalog)

  const options = useMemo(() => {
    const count = <K extends string>(key: (m: MatchSummary) => K): Map<K, number> => {
      const map = new Map<K, number>()
      for (const m of matches) map.set(key(m), (map.get(key(m)) ?? 0) + 1)
      return map
    }
    const sorted = <K extends string>(map: Map<K, number>, label: (k: K) => string): Option[] =>
      [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([k, n]) => ({ value: k, label: `${label(k) || '—'} · ${n}` }))

    const queues = count((m) => (m.custom ? 'custom' : m.queue))
    const seasons = [...count((m) => m.season).entries()]
      .sort((a, b) => (catalog?.seasons[b[0]]?.start ?? 0) - (catalog?.seasons[a[0]]?.start ?? 0))
      .map(([k, n]) => ({ value: k, label: `${seasonLabel(catalog, k) || k.slice(0, 8)} · ${n}` }))
    return {
      queue: sorted(queues, (q) => modeOf(catalog, { queue: q, custom: q === 'custom' }).name),
      season: seasons,
      map: sorted(
        count((m) => m.map),
        (m) => mapOf(catalog, m).name
      ),
      agent: sorted(
        count((m) => m.agent),
        (a) => agentOf(catalog, a).name
      )
    }
  }, [matches, catalog])

  const field = (key: keyof CareerFilter, label: string, list: Option[]): JSX.Element => (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="label">{label}</span>
      <Select
        value={value[key]}
        minWidth={150}
        options={[{ value: ALL, label: t('filter_all') }, ...list]}
        onChange={(v) => onChange({ ...value, [key]: v })}
      />
    </label>
  )

  return (
    <div className="flex flex-wrap items-end gap-3">
      {field('queue', t('mode'), options.queue)}
      {field('season', t('filter_act'), options.season)}
      {field('map', t('map'), options.map)}
      {field('agent', t('agent'), options.agent)}
    </div>
  )
}
