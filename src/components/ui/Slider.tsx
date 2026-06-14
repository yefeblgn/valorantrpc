import * as RSlider from '@radix-ui/react-slider'

export function Slider({
  value,
  onChange,
  onCommit,
  min = 1,
  max = 10,
  step = 1
}: {
  value: number
  onChange: (v: number) => void
  onCommit?: (v: number) => void
  min?: number
  max?: number
  step?: number
}): JSX.Element {
  return (
    <RSlider.Root
      className="relative flex h-5 w-[150px] touch-none select-none items-center"
      value={[value]}
      min={min}
      max={max}
      step={step}
      onValueChange={(v) => onChange(v[0])}
      onValueCommit={(v) => onCommit?.(v[0])}
    >
      <RSlider.Track className="relative h-1 grow rounded-full bg-white/10">
        <RSlider.Range className="absolute h-full rounded-full bg-accent" />
      </RSlider.Track>
      <RSlider.Thumb className="block h-4 w-4 rounded-full bg-white shadow ring-2 ring-accent outline-none transition-transform hover:scale-110" />
    </RSlider.Root>
  )
}
