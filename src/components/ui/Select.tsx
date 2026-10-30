import * as RSelect from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { useDir } from '../../lib/i18n'

export interface Option {
  value: string
  label: string
  disabled?: boolean
}

export function Select({
  value,
  onChange,
  options,
  placeholder,
  minWidth = 160
}: {
  value: string
  onChange: (v: string) => void
  options: Option[]
  placeholder?: string
  minWidth?: number
}): JSX.Element {
  const dir = useDir()
  return (
    <RSelect.Root value={value} onValueChange={onChange} dir={dir}>
      <RSelect.Trigger
        style={{ minWidth }}
        className="input group flex items-center justify-between gap-2"
      >
        <RSelect.Value placeholder={placeholder} />
        <RSelect.Icon>
          <ChevronDown
            size={14}
            className="text-dim transition-transform group-data-[state=open]:rotate-180"
          />
        </RSelect.Icon>
      </RSelect.Trigger>
      <RSelect.Portal>
        <RSelect.Content
          position="popper"
          sideOffset={4}
          className="z-50 max-h-[280px] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[2px] border border-line-2 bg-panel-2 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.8)]"
        >
          <RSelect.Viewport className="p-1">
            {options.map((o) => (
              <RSelect.Item
                key={o.value}
                value={o.value}
                disabled={o.disabled}
                className="flex cursor-pointer items-center gap-2 rounded-[1px] px-2.5 py-1.5 text-[13px] text-muted outline-none data-[highlighted]:bg-accent/15 data-[highlighted]:text-text data-[state=checked]:text-text data-[disabled]:cursor-default data-[disabled]:opacity-40"
              >
                <RSelect.ItemText>{o.label}</RSelect.ItemText>
                <RSelect.ItemIndicator className="ms-auto">
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
