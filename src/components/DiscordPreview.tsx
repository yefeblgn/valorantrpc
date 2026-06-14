import { useEffect, useState } from 'react'
import type { BuiltPresence } from '@shared/types'
import { useT } from '../lib/i18n'
import { elapsed, isUrl } from '../lib/format'

export function DiscordPreview({
  presence,
  rpcEnabled
}: {
  presence: BuiltPresence | null
  rpcEnabled: boolean
}): JSX.Element {
  const t = useT()
  const [, setTick] = useState(0)

  
  useEffect(() => {
    if (!presence?.startTimestamp) return
    const id = setInterval(() => setTick((x) => x + 1), 1000)
    return () => clearInterval(id)
  }, [presence?.startTimestamp])

  return (
    <div className="rounded-xl bg-[#232428] p-3.5 ring-1 ring-black/40">
      <div className="mb-2.5 text-[10px] font-bold uppercase tracking-wider text-[#b5bac1]">
        {t('live_preview')}
      </div>

      {!rpcEnabled || !presence ? (
        <Empty label={!rpcEnabled ? t('rpc_enabled') + ' — ' + t('disconnected') : t('status_idle')} />
      ) : (
        <div className="flex gap-3">
          <ImageStack presence={presence} />
          <div className="flex min-w-0 flex-col justify-center">
            {presence.details && (
              <div className="truncate text-[13px] font-semibold text-white">
                {presence.details}
              </div>
            )}
            {(presence.state || presence.partySize) && (
              <div className="truncate text-[12px] text-[#dbdee1]">
                {presence.state}
                {presence.partySize && (
                  <span className="text-[#b5bac1]">
                    {presence.state ? ' ' : ''}({presence.partySize[0]} of {presence.partySize[1]})
                  </span>
                )}
              </div>
            )}
            {presence.startTimestamp && (
              <div className="text-[12px] text-[#b5bac1]">
                {elapsed(presence.startTimestamp)} elapsed
              </div>
            )}
          </div>
        </div>
      )}

      {rpcEnabled && presence?.buttons && presence.buttons.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {presence.buttons.map((b, i) => (
            <div
              key={i}
              className="truncate rounded-[3px] bg-[#4e5058] px-3 py-1.5 text-center text-[12px] font-medium text-white"
            >
              {b.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ImageStack({ presence }: { presence: BuiltPresence }): JSX.Element {
  return (
    <div className="relative h-[60px] w-[60px] shrink-0">
      <PreviewImage src={presence.largeImage} className="h-[60px] w-[60px] rounded-[8px]" />
      {isUrl(presence.smallImage) && (
        <img
          src={presence.smallImage}
          alt=""
          className="absolute -bottom-1.5 -right-1.5 h-[22px] w-[22px] rounded-full ring-2 ring-[#232428]"
        />
      )}
    </div>
  )
}

function PreviewImage({
  src,
  className
}: {
  src: string | undefined
  className: string
}): JSX.Element {
  const [ok, setOk] = useState(true)

  useEffect(() => {
    setOk(true)
  }, [src])

  if (isUrl(src) && ok) {
    return <img src={src} alt="" onError={() => setOk(false)} className={`object-cover ${className}`} />
  }
  
  return (
    <div className={`flex items-center justify-center bg-gradient-to-br from-accent to-accent-hover ${className}`}>
      <svg width="28" height="28" viewBox="0 0 64 64" aria-hidden>
        <polygon points="13,18 23,18 32,38 41,18 51,18 32,50" fill="#fff" fillOpacity="0.95" />
      </svg>
    </div>
  )
}

function Empty({ label }: { label: string }): JSX.Element {
  return (
    <div className="flex items-center gap-3 py-2 opacity-60">
      <div className="h-[60px] w-[60px] shrink-0 rounded-[8px] bg-[#1e1f22]" />
      <div className="flex flex-col gap-1.5">
        <div className="h-2.5 w-28 rounded bg-[#1e1f22]" />
        <div className="h-2.5 w-20 rounded bg-[#1e1f22]" />
        <div className="text-[11px] text-[#80848e]">{label}</div>
      </div>
    </div>
  )
}
