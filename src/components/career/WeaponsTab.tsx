import { useMemo } from 'react'
import { Crosshair } from 'lucide-react'
import type { MatchSummary } from '@shared/history'
import { useT } from '../../lib/i18n'
import { weaponRows } from '../../lib/career'
import { useHistoryStore, weaponOf } from '../../lib/history'
import { FadeImg } from '../ui/FadeImg'
import { Tip } from '../ui/Tip'
import { Empty, StatTile, TileGrid } from './common'

const COLS = 'grid grid-cols-[minmax(0,1.8fr)_repeat(6,minmax(0,0.7fr))] items-center gap-x-3'
const MIN_ROUNDS = 10

export function WeaponsTab({ matches }: { matches: MatchSummary[] }): JSX.Element {
  const t = useT()
  const catalog = useHistoryStore((s) => s.catalog)
  const rows = useMemo(() => weaponRows(matches), [matches])

  if (!rows.length) {
    return (
      <Empty
        icon={<Crosshair size={26} />}
        title={t('no_weapon_data')}
        desc={t('no_matches_filter')}
      />
    )
  }

  const eligible = rows.filter((r) => r.rounds >= MIN_ROUNDS)
  const best = [...eligible].sort((a, b) => b.kpr - a.kpr)[0]
  const worst = [...eligible].sort((a, b) => a.kpr - b.kpr)[0]
  const sharpest = [...eligible].sort((a, b) => b.hs - a.hs)[0]
  const nemesis = [...rows].sort((a, b) => b.deaths - a.deaths)[0]
  const name = (uuid: string | undefined): string =>
    uuid ? (weaponOf(catalog, uuid)?.name ?? '—') : '—'

  return (
    <div className="flex flex-col gap-4">
      <TileGrid cols={4}>
        <StatTile
          label={t('weapon_best')}
          value={name(best?.weapon)}
          sub={best ? `${best.kpr} ${t('kills_per_round')}` : undefined}
          hint={t('weapon_best_desc')}
        />
        <StatTile
          label={t('weapon_weakest')}
          value={name(worst?.weapon)}
          sub={worst ? `${worst.kpr} ${t('kills_per_round')}` : undefined}
        />
        <StatTile
          label={t('weapon_sharpest')}
          value={name(sharpest?.weapon)}
          sub={sharpest ? `${sharpest.hs}% HS` : undefined}
        />
        <StatTile
          label={t('weapon_nemesis')}
          value={name(nemesis?.weapon)}
          sub={nemesis ? t('deaths_n').replace('{n}', String(nemesis.deaths)) : undefined}
          hint={t('weapon_nemesis_desc')}
        />
      </TileGrid>

      <section className="panel min-w-0 overflow-hidden">
        <div className={`${COLS} border-b border-line px-4 py-2.5`}>
          <span className="label">{t('econ_weapon')}</span>
          <span className="label">{t('kills')}</span>
          <Tip label={t('kills_per_round')} desc={t('kpr_desc')} side="top">
            <span className="label w-fit cursor-help">KPR</span>
          </Tip>
          <span className="label">{t('col_hs')}</span>
          <Tip label="ADR" desc={t('weapon_adr_desc')} side="top">
            <span className="label w-fit cursor-help">ADR</span>
          </Tip>
          <span className="label">{t('rounds')}</span>
          <Tip label={t('deaths_to')} desc={t('deaths_to_desc')} side="top">
            <span className="label w-fit cursor-help">{t('deaths_to')}</span>
          </Tip>
        </div>
        <div className="divide-y divide-line">
          {rows.map((r) => {
            const w = weaponOf(catalog, r.weapon)
            return (
              <div key={r.weapon} className={`${COLS} px-4 py-2`}>
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-24 shrink-0 items-center justify-center">
                    {(w?.kill || w?.icon) && (
                      <FadeImg
                        src={(w.kill || w.icon) as string}
                        className="max-h-full max-w-full object-contain opacity-85 [[data-theme=light]_&]:invert"
                      />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="display block truncate text-[15px] tracking-[0.04em]">
                      {w?.name ?? '—'}
                    </span>
                    <span className="block truncate text-[11px] text-dim">{w?.category ?? ''}</span>
                  </span>
                </span>
                <span className="display text-[15px] tabular-nums">{r.kills}</span>
                <span className="display text-[15px] tabular-nums">
                  {r.rounds ? r.kpr.toFixed(2) : '—'}
                </span>
                <span className="display text-[15px] tabular-nums">
                  {r.head + r.body + r.leg ? `${r.hs}%` : '—'}
                </span>
                <span className="display text-[15px] tabular-nums">
                  {r.rounds ? Math.round(r.damage / r.rounds) : '—'}
                </span>
                <span className="display text-[15px] tabular-nums text-muted">{r.rounds}</span>
                <span className="display text-[15px] tabular-nums text-muted">{r.deaths}</span>
              </div>
            )
          })}
        </div>
      </section>
      <p className="text-[12px] leading-snug text-dim">{t('weapon_note')}</p>
    </div>
  )
}
