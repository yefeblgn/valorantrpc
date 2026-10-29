import type { MatchReport } from '@shared/types'
import { useT } from '../lib/i18n'

export function MatchHeader({ report }: { report: MatchReport }): JSX.Element {
  const t = useT()
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
      <span className="display flex items-center gap-2 border border-accent/60 bg-accent/10 px-2.5 py-1 text-[13px] tracking-[0.14em] text-accent">
        <span className="h-1.5 w-1.5 rotate-45 animate-pulse-dot bg-accent" />
        {t(report.phase === 'pregame' ? 'phase_pregame' : 'phase_ingame')}
      </span>
      {report.mapName && (
        <span className="display text-[22px] tracking-[0.06em]">{report.mapName}</span>
      )}
      {report.modeName && (
        <span className="display text-[15px] tracking-[0.1em] text-muted">{report.modeName}</span>
      )}
    </div>
  )
}
