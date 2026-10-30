import type { ReactNode } from 'react'

export function SectionTitle({
  children,
  action
}: {
  children: ReactNode
  action?: ReactNode
}): JSX.Element {
  return (
    <div className="mb-2.5 flex min-h-6 items-center gap-2.5">
      <span className="h-[2px] w-3 shrink-0 bg-accent" />
      <h2 className="label text-muted">{children}</h2>
      {action && <div className="ms-auto flex items-center gap-2">{action}</div>}
    </div>
  )
}

export function PageHeader({ title, desc }: { title: string; desc?: string }): JSX.Element {
  return (
    <header className="mb-5">
      <h1 className="display text-[32px] tracking-[0.04em]">{title}</h1>
      {desc && <p className="mt-2 text-[13.5px] text-dim">{desc}</p>}
    </header>
  )
}
