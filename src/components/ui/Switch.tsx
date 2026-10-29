import * as RSwitch from '@radix-ui/react-switch'

export function Switch({
  checked,
  onChange,
  label
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
}): JSX.Element {
  return (
    <RSwitch.Root
      checked={checked}
      onCheckedChange={onChange}
      aria-label={label}
      className="relative h-[20px] w-[38px] shrink-0 rounded-[2px] border border-line-2 bg-bg outline-none transition-colors hover:border-dim focus-visible:border-accent data-[state=checked]:border-accent data-[state=checked]:bg-accent"
    >
      <RSwitch.Thumb className="block h-[12px] w-[12px] translate-x-[3px] rounded-[1px] bg-muted transition-transform duration-150 will-change-transform data-[state=checked]:translate-x-[21px] data-[state=checked]:bg-white" />
    </RSwitch.Root>
  )
}
