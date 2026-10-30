import { useEffect, useState, type ReactNode } from 'react'
import { Crosshair } from 'lucide-react'
import type { MatchReport, OverlayView } from '@shared/types'
import { AppLogo, STUDIO, StudioMark, StudioTag } from '../components/brand'
import { MatchBoard } from '../components/MatchBoard'
import { MatchHeader } from '../components/MatchHeader'
import { Keys } from '../components/ui/Keys'
import { TipProvider } from '../components/ui/Tip'
import { initStore, useStore } from '../store'
import { useT } from '../lib/i18n'
import { useMatch } from '../lib/useMatch'
import { useAppearance } from '../lib/useAppearance'
import { AgentSelectHud } from './AgentSelectHud'

const BASE_HEIGHT = 1080
const MIN_SCALE = 0.5
const MAX_SCALE = 3

function useStageScale(): number {
  const uiScale = useStore((s) => s.settings?.uiScale ?? 100)
  const [height, setHeight] = useState(window.innerHeight)

  useEffect(() => {
    const onResize = (): void => setHeight(window.innerHeight)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const scale = (height * uiScale) / 100 / BASE_HEIGHT
  return Math.min(Math.max(scale, MIN_SCALE), MAX_SCALE)
}

export function OverlayApp(): JSX.Element {
  const [view, setView] = useState<OverlayView>({ tracker: false, hud: false })
  const hotkey = useStore((s) => s.settings?.overlayHotkey ?? 'Ctrl+T')
  const report = useMatch()
  const scale = useStageScale()
  useAppearance({ themed: false })

  useEffect(() => {
    void initStore()
    const off = window.api.onOverlayView(setView)
    void window.api.getOverlayView().then(setView)
    return off
  }, [])

  const hud = view.hud && report?.phase === 'pregame'

  return (
    <TipProvider>
      <div
        className="fixed left-0 top-0 origin-top-left"
        style={{
          width: `${100 / scale}vw`,
          height: `${100 / scale}vh`,
          transform: `scale(${scale})`
        }}
      >
        <Layer visible={view.tracker}>
          <Tracker report={report} hotkey={hotkey} />
        </Layer>
        <Layer visible={hud}>{report && <AgentSelectHud report={report} hotkey={hotkey} />}</Layer>
      </div>
    </TipProvider>
  )
}

function Layer({ visible, children }: { visible: boolean; children: ReactNode }): JSX.Element {
  return (
    <div
      aria-hidden={!visible}
      className={`absolute inset-0 transition-opacity duration-150 ease-out will-change-[opacity] ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {children}
    </div>
  )
}

function Tracker({ report, hotkey }: { report: MatchReport | null; hotkey: string }): JSX.Element {
  const t = useT()

  return (
    <>
      <div className="absolute inset-0 bg-[rgba(5,7,11,0.66)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.55))]" />

      <div className="relative mx-auto flex h-full max-w-[1720px] flex-col justify-center gap-5 px-12 py-10">
        <div className="flex items-center justify-between gap-6">
          <div className="flex min-w-0 items-center gap-5">
            <div className="flex items-center gap-2.5">
              <AppLogo size={26} />
              <span className="display text-[18px] tracking-[0.08em]">
                Valorant<span className="text-accent">RPC</span>
              </span>
              <StudioTag size={16} tone="dark" className="ms-1" />
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

      <div className="pointer-events-none absolute bottom-6 end-8 flex items-center gap-2 opacity-40">
        <StudioMark size={22} tone="dark" />
        <span className="display text-[13px] tracking-[0.2em] text-muted">{STUDIO}</span>
      </div>
    </>
  )
}
