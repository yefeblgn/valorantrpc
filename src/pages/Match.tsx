import { Crosshair, Info, ShieldAlert } from 'lucide-react'
import { PageHeader } from '../components/Card'
import { MatchBoard } from '../components/MatchBoard'
import { MatchHeader } from '../components/MatchHeader'
import { Keys } from '../components/ui/Keys'
import { useStore } from '../store'
import { useT } from '../lib/i18n'
import { useMatch } from '../lib/useMatch'

export function Match(): JSX.Element {
  const t = useT()
  const settings = useStore((s) => s.settings)!
  const patch = useStore((s) => s.patch)
  const report = useMatch()

  return (
    <div className="flex flex-col gap-5 p-6">
      <PageHeader title={t('nav_match')} desc={t('match_desc')} />

      {!settings.overlayEnabled ? (
        <div className="panel ticks flex flex-col gap-4 p-6">
          <div className="flex items-start gap-4">
            <Crosshair size={28} className="mt-1 shrink-0 text-accent" />
            <div>
              <div className="display text-[22px] tracking-[0.05em]">{t('overlay_off_title')}</div>
              <p className="mt-2 max-w-[560px] text-[13.5px] leading-relaxed text-muted">
                {t('overlay_off_desc')}
              </p>
            </div>
          </div>
          <RiskNote />
          <div>
            <button
              onClick={() => void patch({ overlayEnabled: true })}
              className="btn btn-primary"
            >
              {t('enable')}
            </button>
          </div>
        </div>
      ) : report ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <MatchHeader report={report} />
            <div className="flex items-center gap-3">
              <span className="text-[12.5px] text-dim">{t('overlay_open_hint')}</span>
              <Keys value={settings.overlayHotkey} size="sm" />
            </div>
          </div>
          <MatchBoard report={report} />
        </>
      ) : (
        <div className="panel flex items-center gap-4 border-dashed px-5 py-6">
          <Crosshair size={26} className="shrink-0 text-dim" />
          <div className="min-w-0 flex-1">
            <div className="display text-[20px] tracking-[0.05em]">{t('no_match')}</div>
            <p className="mt-1 text-[13px] text-muted">{t('no_match_desc')}</p>
          </div>
          <div className="hidden shrink-0 items-center gap-2 @xl:flex">
            <span className="text-[12.5px] text-dim">{t('overlay_open_hint')}</span>
            <Keys value={settings.overlayHotkey} size="sm" />
          </div>
        </div>
      )}

      {settings.overlayEnabled && (
        <div className="flex items-start gap-3 text-[12.5px] leading-snug text-dim">
          <Info size={14} className="mt-0.5 shrink-0" />
          <span>
            {t('overlay_focus_note')} {t('overlay_display_note')} {t('overlay_privacy')}
          </span>
        </div>
      )}
    </div>
  )
}

export function RiskNote(): JSX.Element {
  const t = useT()
  return (
    <div className="flex items-start gap-3 border border-warn/40 border-s-[3px] border-s-warn bg-warn/[0.06] px-4 py-3">
      <ShieldAlert size={16} className="mt-0.5 shrink-0 text-warn" />
      <div>
        <div className="display text-[13px] tracking-[0.12em] text-warn">
          {t('overlay_risk_title')}
        </div>
        <p className="mt-1 text-[12.5px] leading-snug text-muted">{t('overlay_risk')}</p>
      </div>
    </div>
  )
}
