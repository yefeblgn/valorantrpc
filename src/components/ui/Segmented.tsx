import { motion } from 'framer-motion'

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  id = 'seg'
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  id?: string
}): JSX.Element {
  return (
    <div className="glass-subtle flex rounded-xl p-0.5 border border-white/6">
      {options.map((o) => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className="relative px-3.5 py-1.5 text-[12px] font-semibold rounded-lg overflow-hidden"
          >
            {active && (
              <motion.span
                layoutId={`segmented-${id}`}
                className="glass-accent absolute inset-0 rounded-lg"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <span className={`relative z-10 ${active ? 'text-white' : 'text-muted'}`}>
              {o.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
