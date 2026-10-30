import { useEffect, useState, type ReactNode } from 'react'
import { Crosshair, Maximize2, Minimize2, X } from 'lucide-react'
import { DEFAULT_HUD_LAYOUT, type MatchReport, type OverlayView } from '@shared/types'
import { AppLogo, STUDIO, StudioMark, StudioTag } from '../components/brand'
import { MatchBoard } from '../components/MatchBoard'
import { MatchHeader } from '../components/MatchHeader'
import { Keys } from '../components/ui/Keys'
import { Tip, TipProvider } from '../components/ui/Tip'
import { initStore, useStore } from '../store'
import { useT } from '../lib/i18n'
import { useMatch } from '../lib/useMatch'
import { useAppearance } from '../lib/useAppearance'
import { AgentSelectHud } from './AgentSelectHud'

const BASE_HEIGHT = 1080
const MIN_SCALE = 0.5
const MAX_SCALE = 3
const REGION_MS = 100
const EASE = 'ease-[cubic-bezier(0.16,1,0.3,1)]'

function useStage(): { scale: number; width: number; height: number } {
  const uiScale = useStore((s) => s.settings?.uiScale ?? 100)
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight })

  useEffect(() => {
    const onResize = (): void => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const raw = (size.h * uiScale) / 100 / BASE_HEIGHT
  const scale = Math.min(Math.max(raw, MIN_SCALE), MAX_SCALE)
  return { scale, width: size.w / scale, height: size.h / scale }
}

function useHudRegion(active: boolean): void {
  useEffect(() => {
    if (!active) return
    let held = false
    let last = ''
    const send = (): void => {
      const el = document.querySelector('[data-hud]')
      const r = el?.getBoundingClientRect()
      const region =
        r && r.width > 0 && r.height > 0
          ? {
              x: Math.round(r.left),
              y: Math.round(r.top),
              width: Math.round(r.width),
              height: Math.round(r.height)
            }
          : null
      const key = `${JSON.stringify(region)}|${held}`
      if (key === last) return
      last = key
      window.api.setOverlayRegion(region, held)
    }
    const onDown = (): void => {
      held = true
      send()
    }
    const onUp = (): void => {
      held = false
      send()
    }
    const timer = setInterval(send, REGION_MS)
    send()
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('pointerup', onUp, true)
    document.addEventListener('pointercancel', onUp, true)
    return () => {
      clearInterval(timer)
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('pointerup', onUp, true)
      document.removeEventListener('pointercancel', onUp, true)
      window.api.setOverlayRegion(null, false)
    }
  }, [active])
}

function useEscapeClose(active: boolean): void {
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') window.api.closeOverlay()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])
}

export function OverlayApp(): JSX.Element {
  const [view, setView] = useState<OverlayView>({ tracker: false, hud: false })
  const hotkey = useStore((s) => s.settings?.overlayHotkey ?? 'Ctrl+T')
  const layout = useStore((s) => s.settings?.hudLayout ?? DEFAULT_HUD_LAYOUT)
  const compact = useStore((s) => s.settings?.hudCompact ?? false)
  const trackerCompact = useStore((s) => s.settings?.trackerCompact ?? false)
  const patch = useStore((s) => s.patch)
  const report = useMatch()
  const stage = useStage()
  const scale = stage.scale
  useAppearance({ themed: false })

  useEffect(() => {
    void initStore()
    const off = window.api.onOverlayView(setView)
    void window.api.getOverlayView().then(setView)
    return off
  }, [])

  const hud = view.hud && report?.phase === 'pregame'
  useHudRegion(hud)
  useEscapeClose(view.tracker)

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
          <Tracker
            report={report}
            hotkey={hotkey}
            visible={view.tracker}
            compact={trackerCompact}
            onCompact={(v) => void patch({ trackerCompact: v })}
          />
        </Layer>
        <Layer visible={hud}>
          <div
            className={`absolute inset-0 transition-transform duration-300 motion-reduce:transition-none ${EASE} ${
              hud ? 'translate-x-0' : 'translate-x-4'
            }`}
          >
            {report && (
              <AgentSelectHud
                report={report}
                hotkey={hotkey}
                layout={layout}
                compact={compact}
                stage={{ width: stage.width, height: stage.height, pointerScale: scale }}
                onLayout={(x, y) => void patch({ hudLayout: { ...layout, x, y } })}
                onCompact={(v) => void patch({ hudCompact: v })}
                onClose={() => window.api.dismissHud()}
              />
            )}
          </div>
        </Layer>
      </div>
    </TipProvider>
  )
}

function Layer({ visible, children }: { visible: boolean; children: ReactNode }): JSX.Element {
  return (
    <div
      aria-hidden={!visible}
      className={`absolute inset-0 transition-opacity duration-200 ease-out will-change-[opacity] motion-reduce:transition-none ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      {children}
    </div>
  )
}

function Tracker({
  report,
  hotkey,
  visible,
  compact,
  onCompact
}: {
  report: MatchReport | null
  hotkey: string
  visible: boolean
  compact: boolean
  onCompact: (compact: boolean) => void
}): JSX.Element {
  const t = useT()

  return (
    <>
      <div
        className={`absolute inset-0 transition-colors duration-300 ${
          compact ? 'bg-[rgba(5,7,11,0.28)]' : 'bg-[rgba(5,7,11,0.66)]'
        }`}
      />
      {!compact && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.55))]" />
      )}

      <div
        className={`relative mx-auto flex h-full flex-col gap-5 px-12 transition-[transform,opacity] duration-300 motion-reduce:transition-none ${EASE} ${
          compact ? 'max-w-[1180px] justify-start py-8' : 'max-w-[1720px] justify-center py-10'
        } ${visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}
      >
        <div className="relative flex items-center justify-between gap-6 border border-line bg-[rgba(9,12,17,0.82)] px-4 py-3">
          <span
            className={`absolute inset-x-0 top-0 h-[2px] origin-left bg-accent transition-transform duration-500 motion-reduce:transition-none ${EASE} ${
              visible ? 'scale-x-100' : 'scale-x-0'
            }`}
          />
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
          <div className="flex shrink-0 items-center gap-3">
            <div className="flex items-center gap-2 text-[13px] text-muted">
              <Keys value={hotkey} />
              <span className="text-dim">/</span>
              <Keys value="Esc" />
              <span>{t('overlay_close_hint')}</span>
            </div>
            <span className="h-6 w-px bg-line-2" />
            <PanelButton
              label={t(compact ? 'hud_expand' : 'hud_compact')}
              onClick={() => onCompact(!compact)}
            >
              {compact ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
            </PanelButton>
            <PanelButton label={t('overlay_close')} onClick={() => window.api.closeOverlay()}>
              <X size={15} />
            </PanelButton>
          </div>
        </div>

        {report ? (
          <MatchBoard report={report} compact={compact} />
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

      {!compact && (
        <div className="pointer-events-none absolute bottom-6 end-8 flex items-center gap-2 opacity-40">
          <StudioMark size={22} tone="dark" />
          <span className="display text-[13px] tracking-[0.2em] text-muted">{STUDIO}</span>
        </div>
      )}
    </>
  )
}

function PanelButton({
  label,
  onClick,
  children
}: {
  label: string
  onClick: () => void
  children: JSX.Element
}): JSX.Element {
  return (
    <Tip label={label} side="bottom">
      <button
        onClick={onClick}
        aria-label={label}
        className="flex h-8 w-8 items-center justify-center border border-line-2 bg-black/30 text-muted transition-colors hover:border-accent/60 hover:bg-accent/15 hover:text-text"
      >
        {children}
      </button>
    </Tip>
  )
}
