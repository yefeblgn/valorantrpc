import { Minus, X } from 'lucide-react'

export function TitleBar(): JSX.Element {
  return (
    <header className="drag flex h-11 shrink-0 items-center justify-between border-b border-white/5 pl-3.5 pr-1">
      <div className="flex items-center gap-2.5">
        <svg width="18" height="18" viewBox="0 0 100 100" aria-hidden>
          <circle cx="50" cy="50" r="48" fill="var(--accent)" />
          <polygon points="25,26 34,26 44,52 44,78" fill="#fff" fillOpacity="0.95" />
          <polygon points="75,26 66,26 56,52 56,78" fill="#fff" fillOpacity="0.95" />
        </svg>
        <span className="text-[13px] font-semibold tracking-wide">
          Valorant<span className="text-accent">RPC</span>
        </span>
      </div>
      <div className="no-drag flex items-center gap-1">
        <button
          onClick={() => window.api.minimize()}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-white/8 hover:text-text"
          aria-label="Küçült"
        >
          <Minus size={15} />
        </button>
        <button
          onClick={() => window.api.close()}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-accent hover:text-white"
          aria-label="Kapat"
        >
          <X size={15} />
        </button>
      </div>
    </header>
  )
}
