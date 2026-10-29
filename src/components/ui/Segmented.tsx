export function Segmented<T extends string>({
  value,
  options,
  onChange
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}): JSX.Element {
  return (
    <div className="flex gap-0.5 rounded-[2px] border border-line-2 bg-bg p-0.5">
      {options.map((o) => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            className={`display h-7 rounded-[1px] px-3.5 text-[13px] tracking-[0.1em] transition-colors duration-150 ${
              active ? 'bg-accent text-white' : 'text-dim hover:bg-hover hover:text-muted'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
