import * as RTooltip from '@radix-ui/react-tooltip'
import type { ReactNode } from 'react'
import { useDir } from '../../lib/i18n'

const MIRRORED = { left: 'right', right: 'left', top: 'top', bottom: 'bottom' } as const

export function TipProvider({ children }: { children: ReactNode }): JSX.Element {
  return (
    <RTooltip.Provider delayDuration={300} skipDelayDuration={200}>
      {children}
    </RTooltip.Provider>
  )
}

export function Tip({
  label,
  desc,
  hint,
  side = 'right',
  disabled = false,
  children
}: {
  label: ReactNode
  desc?: ReactNode
  hint?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  disabled?: boolean
  children: ReactNode
}): JSX.Element {
  const dir = useDir()
  if (disabled) return <>{children}</>
  return (
    <RTooltip.Root>
      <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
      <RTooltip.Portal>
        <RTooltip.Content
          side={dir === 'rtl' ? MIRRORED[side] : side}
          sideOffset={10}
          collisionPadding={10}
          className="tip"
        >
          <div className="flex items-center gap-2.5">
            <span className="display text-[13px] tracking-[0.1em] text-text">{label}</span>
            {hint && (
              <span className="display border border-line-2 px-1 py-px text-[10.5px] tracking-[0.08em] text-dim">
                {hint}
              </span>
            )}
          </div>
          {desc && (
            <div className="mt-1 max-w-[240px] text-[12px] leading-snug text-muted">{desc}</div>
          )}
        </RTooltip.Content>
      </RTooltip.Portal>
    </RTooltip.Root>
  )
}
