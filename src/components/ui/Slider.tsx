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
      <RSlider.Track className="relative h-[3px] grow bg-line-2">
        <RSlider.Range className="absolute h-full bg-accent" />
      </RSlider.Track>
      <RSlider.Thumb className="block h-3 w-3 rotate-45 border-2 border-accent bg-white outline-none transition-transform hover:scale-125 focus-visible:scale-125" />
    </RSlider.Root>
  )
}
