import { useEffect, useState } from 'react'
import { Crosshair } from 'lucide-react'
import { AppLogo, STUDIO, StudioMark, StudioTag } from '../components/brand'
import { MatchBoard } from '../components/MatchBoard'
import { MatchHeader } from '../components/MatchHeader'
import { Keys } from '../components/ui/Keys'
import { TipProvider } from '../components/ui/Tip'
import { initStore, useStore } from '../store'
import { useT } from '../lib/i18n'
import { useMatch } from '../lib/useMatch'
import { useAppearance } from '../lib/useAppearance'

export function OverlayApp(): JSX.Element {
  const t = useT()
  const [visible, setVisible] = useState(false)
  const hotkey = useStore((s) => s.settings?.overlayHotkey ?? 'Ctrl+T')
  const report = useMatch()
  useAppearance({ themed: false })

  useEffect(() => {
    void initStore()
    const off = window.api.onOverlayVisible(setVisible)
    void window.api.getOverlayVisible().then(setVisible)
    return off
  }, [])

  return (
    <TipProvider>
      <div
        className={`fixed inset-0 transition-opacity duration-200 ease-out ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="absolute inset-0 bg-[rgba(5,7,11,0.66)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.55))]" />

        <div
          className={`relative mx-auto flex h-full max-w-[1720px] flex-col justify-center gap-5 px-12 py-10 transition-transform duration-200 ease-out ${
            visible ? 'translate-y-0' : 'translate-y-2'
          }`}
        >
          <div className="flex items-center justify-between gap-6">
            <div className="flex min-w-0 items-center gap-5">
              <div className="flex items-center gap-2.5">
                <AppLogo size={26} />
                <span className="display text-[18px] tracking-[0.08em]">
                  Valorant<span className="text-accent">RPC</span>
                </span>
                <StudioTag size={16} tone="dark" className="ml-1" />
              </div>
              <span className="h-6 w-px bg-line-2" />
              {report ? (
                <MatchHeader report={report} />
              ) : (
                <span className="display text-[18px] tracking-[0.1em] text-muted">
                  {t('tab_overlay')}
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2.5 text-[13px] text-muted">
              <Keys value={hotkey} />
              <span>{t('overlay_close_hint')}</span>
            </div>
          </div>

          {report ? (
            <MatchBoard report={report} />
          ) : (
            <div className="panel flex items-center gap-4 px-6 py-8">
              <Crosshair size={28} className="shrink-0 text-dim" />
              <div>
                <div className="display text-[22px] tracking-[0.05em]">{t('no_match')}</div>
                <p className="mt-1 text-[14px] text-muted">{t('no_match_desc')}</p>
              </div>
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute bottom-6 right-8 flex items-center gap-2 opacity-40">
          <StudioMark size={22} tone="dark" />
          <span className="display text-[13px] tracking-[0.2em] text-muted">{STUDIO}</span>
        </div>
      </div>
    </TipProvider>
  )
}
