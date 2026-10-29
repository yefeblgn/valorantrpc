export function Keys({ value, size = 'md' }: { value: string; size?: 'sm' | 'md' }): JSX.Element {
  const keys = value.split('+').filter(Boolean)
  const cap =
    size === 'sm' ? 'h-5 min-w-5 px-1.5 text-[11px]' : 'h-6 min-w-6 px-2 text-[12.5px] border-b-2'
  return (
    <span className="inline-flex items-center gap-1">
      {keys.map((key, i) => (
        <kbd
          key={`${key}-${i}`}
          className={`display inline-flex items-center justify-center rounded-[2px] border border-line-2 bg-panel-2 tracking-[0.06em] text-text ${cap}`}
        >
          {key}
        </kbd>
      ))}
    </span>
  )
}
