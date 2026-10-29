import type { ReactNode } from 'react'

export function Field({
  label,
  desc,
  descTone = 'default',
  children
}: {
  label: string
  desc?: string
  descTone?: 'default' | 'error'
  children: ReactNode
}): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-5 px-4 py-3.5">
      <div className="min-w-0">
        <div className="text-[14px] font-medium text-text">{label}</div>
        {desc && (
          <div
            className={`mt-1 text-[12.5px] leading-snug ${descTone === 'error' ? 'text-accent' : 'text-dim'}`}
          >
            {desc}
          </div>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
