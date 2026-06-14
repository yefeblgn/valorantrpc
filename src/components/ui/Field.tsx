import type { ReactNode } from 'react'

export function Field({
  label,
  desc,
  children
}: {
  label: string
  desc?: string
  children: ReactNode
}): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-text">{label}</div>
        {desc && <div className="mt-0.5 text-[11.5px] text-dim">{desc}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
