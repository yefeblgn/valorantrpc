import * as RSwitch from '@radix-ui/react-switch'

export function Switch({
  checked,
  onChange
}: {
  checked: boolean
  onChange: (v: boolean) => void
}): JSX.Element {
  return (
    <RSwitch.Root
      checked={checked}
      onCheckedChange={onChange}
      className="relative h-[22px] w-[40px] shrink-0 rounded-full bg-white/5 outline-none border border-white/10 transition-colors data-[state=checked]:bg-accent data-[state=checked]:border-accent"
    >
      <RSwitch.Thumb className="block h-[16px] w-[16px] translate-x-[3px] rounded-full bg-white shadow-sm transition-transform duration-150 will-change-transform data-[state=checked]:translate-x-[21px]" />
    </RSwitch.Root>
  )
}
