import { Minus, X } from 'lucide-react'
import { useT } from '../lib/i18n'
import { statusView } from '../lib/status'
import { useStore } from '../store'
import { AppLogo, StudioTag } from './brand'
import { Tip } from './ui/Tip'

export function TitleBar(): JSX.Element {
  const t = useT()
  const snap = useStore((s) => s.snapshot)
  const closeToTray = useStore((s) => s.settings?.closeToTray ?? true)
  const status = statusView(snap, t)

  return (
    <header className="drag flex h-10 shrink-0 items-center justify-between border-b border-line bg-surface pl-[21px]">
      <div className="flex items-center gap-2.5">
        <AppLogo size={20} />
        <span className="display text-[16px] tracking-[0.08em]">
          Valorant<span className="text-accent">RPC</span>
        </span>
        <span className="h-4 w-px bg-line-2" />
        <StudioTag size={14} />
      </div>
      <div className="flex h-full items-center">
        <div className="mr-2 flex h-6 items-center gap-2 border border-line px-2.5">
          <span
            className={`h-1.5 w-1.5 rotate-45 ${status.active ? 'animate-pulse-dot' : ''}`}
            style={{ background: status.color }}
          />
          <span
            className={`display text-[12px] tracking-[0.14em] ${status.active ? 'text-text' : 'text-dim'}`}
          >
            {status.label}
          </span>
        </div>
        <Tip label={t('minimize')} side="bottom">
          <button
            onClick={() => window.api.minimize()}
            className="no-drag flex h-full w-11 items-center justify-center text-muted transition-colors hover:bg-hover hover:text-text"
            aria-label={t('minimize')}
          >
            <Minus size={15} />
          </button>
        </Tip>
        <Tip label={t('close')} desc={closeToTray ? t('close_tip') : undefined} side="bottom">
          <button
            onClick={() => window.api.close()}
            className="no-drag flex h-full w-11 items-center justify-center text-muted transition-colors hover:bg-accent hover:text-white"
            aria-label={t('close')}
          >
            <X size={15} />
          </button>
        </Tip>
      </div>
    </header>
  )
}
