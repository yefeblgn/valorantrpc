import { useLayoutEffect, useRef, useState, type ImgHTMLAttributes } from 'react'

export function FadeImg({
  src,
  className = '',
  style,
  ...rest
}: ImgHTMLAttributes<HTMLImageElement>): JSX.Element {
  const ref = useRef<HTMLImageElement>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading')

  useLayoutEffect(() => {
    const el = ref.current
    setState(el?.complete && el.naturalWidth > 0 ? 'ready' : 'loading')
  }, [src])

  return (
    <img
      ref={ref}
      src={src}
      alt=""
      decoding="async"
      draggable={false}
      onLoad={() => setState('ready')}
      onError={() => setState('failed')}
      className={`transition-opacity duration-300 ${className}`}
      style={{
        ...style,
        ...(state === 'ready' ? null : { opacity: 0 }),
        ...(state === 'failed' ? { visibility: 'hidden' } : null)
      }}
      {...rest}
    />
  )
}
