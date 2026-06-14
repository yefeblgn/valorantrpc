import type { ReactNode } from 'react'

export function Card({
  children,
  className = ''
}: {
  children: ReactNode
  className?: string
}): JSX.Element {
  return <div className={`glass rounded-2xl ${className}`}>{children}</div>
}

export function SectionTitle({ children }: { children: ReactNode }): JSX.Element {
  return (
    <h2 className="mb-2.5 px-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-dim">
      {children}
    </h2>
  )
}
