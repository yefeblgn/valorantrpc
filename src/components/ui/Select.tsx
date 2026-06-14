import * as RSelect from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'

export interface Option {
  value: string
  label: string
}

export function Select({
  value,
  onChange,
  options,
  placeholder,
  minWidth = 150
}: {
  value: string
  onChange: (v: string) => void
  options: Option[]
  placeholder?: string
  minWidth?: number
}): JSX.Element {
  return (
    <RSelect.Root value={value} onValueChange={onChange}>
      <RSelect.Trigger
        style={{ minWidth }}
        className="glass-subtle glass-hover flex items-center justify-between gap-2 rounded-xl px-3 py-1.5 text-[12.5px] text-text outline-none transition data-[state=open]:border-accent"
      >
        <RSelect.Value placeholder={placeholder} />
        <RSelect.Icon>
          <ChevronDown size={14} className="text-muted" />
        </RSelect.Icon>
      </RSelect.Trigger>
      <RSelect.Portal>
        <RSelect.Content
          position="popper"
          sideOffset={6}
          className="glass z-50 max-h-[280px] overflow-hidden rounded-xl shadow-2xl border border-white/10"
        >
          <RSelect.Viewport className="p-1">
            {options.map((o) => (
              <RSelect.Item
                key={o.value}
                value={o.value}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12.5px] text-muted outline-none transition data-[highlighted]:bg-white/8 data-[highlighted]:text-white data-[state=checked]:text-white"
              >
                <RSelect.ItemText>{o.label}</RSelect.ItemText>
                <RSelect.ItemIndicator className="ml-auto">
                  <Check size={13} className="text-accent" />
                </RSelect.ItemIndicator>
              </RSelect.Item>
            ))}
          </RSelect.Viewport>
        </RSelect.Content>
      </RSelect.Portal>
    </RSelect.Root>
  )
}
