import type { MatchReport } from '@shared/types'
import { useT } from '../lib/i18n'
import { FadeImg } from './ui/FadeImg'

export function MatchHeader({ report }: { report: MatchReport }): JSX.Element {
  const t = useT()
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
      <span className="display flex items-center gap-2 border border-accent/60 bg-accent/10 px-2.5 py-1 text-[13px] tracking-[0.14em] text-accent">
        <span className="h-1.5 w-1.5 rotate-45 animate-pulse-dot bg-accent" />
        {t(report.phase === 'pregame' ? 'phase_pregame' : 'phase_ingame')}
      </span>
      {report.mapName && (
        <span className="flex min-w-0 items-center gap-3">
          {report.mapIcon && (
            <span className="h-8 w-[104px] shrink-0 overflow-hidden border border-line-2 bg-panel-2">
              <FadeImg src={report.mapIcon} className="h-full w-full object-cover" />
            </span>
          )}
          <span className="display truncate text-[22px] tracking-[0.06em]">{report.mapName}</span>
        </span>
      )}
      {report.modeName && (
        <span className="flex items-center gap-2">
          {report.modeIcon && (
            <FadeImg
              src={report.modeIcon}
              className="h-[18px] w-[18px] shrink-0 object-contain opacity-80 [[data-theme=light]_&]:invert"
            />
          )}
          <span className="display text-[15px] tracking-[0.1em] text-muted">{report.modeName}</span>
        </span>
      )}
    </div>
  )
}
