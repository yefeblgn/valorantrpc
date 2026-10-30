import { useMemo } from 'react'
import { ChevronRight, Crown, Flame } from 'lucide-react'
import { acs, sessionOf } from '@shared/history'
import { useT } from '../lib/i18n'
import { agentOf, mapOf, modeOf, useHistory } from '../lib/history'
import { useStore } from '../store'
import { SectionTitle } from './Card'
import { FadeImg } from './ui/FadeImg'
import { RESULT_COLOR, formatTime, signed, useLocale } from './career/common'

export function CareerCards({ onOpen }: { onOpen: (id: string) => void }): JSX.Element | null {
  const t = useT()
  const locale = useLocale()
  const streamer = useStore((s) => s.settings?.streamerMode ?? false)
  const { data, catalog } = useHistory()
  const matches = useMemo(() => (data?.matches ?? []).filter((m) => !m.custom), [data])
  const session = useMemo(() => sessionOf(matches), [matches])
  const latest = data?.matches[0]
  if (!latest) return null

  const map = mapOf(catalog, latest.map)
  const agent = agentOf(catalog, latest.agent)

  return (
    <div className="grid grid-cols-1 gap-5 @2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <section className="min-w-0">
        <SectionTitle>{t('session_title')}</SectionTitle>
        {session ? (
          <div className="panel p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="display text-[26px] tabular-nums">
                <span className="text-good">
                  {session.wins}
                  {t('wins_short')}
                </span>{' '}
                <span className="text-bad">
                  {session.losses}
                  {t('losses_short')}
                </span>
              </span>
              {session.rrKnown && !streamer && (
                <span
                  className={`display text-[20px] tabular-nums ${session.rr > 0 ? 'text-good' : session.rr < 0 ? 'text-bad' : 'text-muted'}`}
                >
                  {signed(session.rr)} RR
                </span>
              )}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-px border border-line bg-line">
              <Mini label={t('matches')} value={String(session.matches)} />
              <Mini label={t('acs')} value={String(session.acs)} />
              <Mini label={t('col_kd')} value={session.kd.toFixed(2)} />
            </div>
            <div className="mt-2.5 text-[11.5px] text-dim">
              {t('session_since').replace('{time}', formatTime(locale, session.start))}
            </div>
          </div>
        ) : (
          <div className="panel flex items-center gap-3 border-dashed px-4 py-5 text-[13px] text-muted">
            <Flame size={18} className="shrink-0 text-dim" />
            {t('session_empty')}
          </div>
        )}
      </section>

      <section className="min-w-0">
        <SectionTitle>{t('last_match')}</SectionTitle>
        <button
          onClick={() => onOpen(latest.id)}
          className="panel group relative block w-full overflow-hidden text-start"
        >
          {map.splash && (
            <FadeImg
              src={map.splash}
              className="absolute inset-0 h-full w-full object-cover opacity-30 transition-opacity group-hover:opacity-40"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-panel via-panel/80 to-panel/30 rtl:bg-gradient-to-l" />
          <span
            className="absolute inset-y-0 start-0 w-[3px]"
            style={{ background: RESULT_COLOR[latest.result] }}
          />
          <div className="relative flex items-center gap-4 p-4">
            <span className="h-14 w-14 shrink-0 overflow-hidden border border-line-2 bg-panel-2">
              {agent.icon && <FadeImg src={agent.icon} className="h-full w-full object-cover" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2.5">
                <span
                  className="display text-[20px] tracking-[0.04em]"
                  style={{ color: RESULT_COLOR[latest.result] }}
                >
                  {t(`result_${latest.result}`)}
                </span>
                <span className="display text-[20px] tabular-nums">
                  {latest.ally} : {latest.enemy}
                </span>
                {latest.mvp && (
                  <Crown
                    size={14}
                    className={latest.mvp === 'match' ? 'text-warn' : 'text-muted'}
                  />
                )}
              </div>
              <div className="mt-0.5 truncate text-[12.5px] text-muted">
                {[map.name, modeOf(catalog, latest).name, agent.name].filter(Boolean).join(' · ')}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px]">
                <span className="display text-[15px] tabular-nums">
                  {latest.kills} / {latest.deaths} / {latest.assists}
                </span>
                {latest.facts && (
                  <span className="text-muted">
                    {t('acs')} <span className="display text-[15px] text-text">{acs(latest)}</span>
                  </span>
                )}
                {latest.rr && !streamer && (
                  <span
                    className={`display text-[15px] tabular-nums ${latest.rr.change > 0 ? 'text-good' : latest.rr.change < 0 ? 'text-bad' : 'text-muted'}`}
                  >
                    {signed(latest.rr.change)} RR
                  </span>
                )}
                {latest.multi[2] > 0 && (
                  <span className="display border border-warn/60 px-1.5 text-[11px] tracking-[0.12em] text-warn">
                    {t('ace')}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight
              size={18}
              className="shrink-0 text-dim transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100"
            />
          </div>
        </button>
      </section>
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="bg-panel px-3 py-2">
      <div className="label">{label}</div>
      <div className="display mt-0.5 text-[17px] tabular-nums">{value}</div>
    </div>
  )
}
