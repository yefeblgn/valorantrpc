import { useEffect, useState } from 'react'
import { Gamepad2, Users } from 'lucide-react'
import type { BuiltPresence } from '@shared/types'
import { useT } from '../lib/i18n'
import { useStore } from '../store'
import { elapsed, isUrl } from '../lib/format'

export function DiscordPreview({
  presence,
  rpcEnabled
}: {
  presence: BuiltPresence | null
  rpcEnabled: boolean
}): JSX.Element {
  const t = useT()
  const lang = useStore((s) => s.settings?.language ?? 'en')
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!presence?.startTimestamp) return
    const id = setInterval(() => setTick((x) => x + 1), 1000)
    return () => clearInterval(id)
  }, [presence?.startTimestamp])

  const party = presence?.partySize
  const partyText = party
    ? lang === 'tr'
      ? `(${party[0]}/${party[1]})`
      : `(${party[0]} of ${party[1]})`
    : ''

  return (
    <div className="rounded-xl bg-[#232428] p-3.5 ring-1 ring-black/40">
      <div className="mb-2.5 text-[12px] font-semibold text-[#dbdee1]">{t('playing')}</div>

      {!rpcEnabled || !presence ? (
        <Empty
          label={!rpcEnabled ? `${t('rpc_enabled')} — ${t('disconnected')}` : t('status_idle')}
        />
      ) : (
        <div className="flex gap-3">
          <ImageStack presence={presence} />
          <div className="flex min-w-0 flex-col justify-center gap-0.5">
            <div className="truncate text-[14px] font-semibold text-white">VALORANT</div>
            {presence.details && (
              <div className="truncate text-[12px] text-[#dbdee1]">{presence.details}</div>
            )}
            {(presence.state || party || presence.startTimestamp) && (
              <div className="flex min-w-0 items-center gap-2 text-[12px] text-[#b5bac1]">
                {(presence.state || party) && (
                  <span className="flex min-w-0 items-center gap-1 truncate">
                    {party && <Users size={12} className="shrink-0" />}
                    <span className="truncate">
                      {presence.state}
                      {presence.state && partyText ? ' ' : ''}
                      {partyText}
                    </span>
                  </span>
                )}
                {presence.startTimestamp && (
                  <span className="flex shrink-0 items-center gap-1 font-medium text-[#3ba55d]">
                    <Gamepad2 size={13} />
                    {elapsed(presence.startTimestamp)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {rpcEnabled && presence?.joinSecret ? (
        <div className="mt-3 rounded-[4px] bg-[#5865f2] px-3 py-1.5 text-center text-[12px] font-medium text-white">
          {t('ask_to_join')}
        </div>
      ) : (
        rpcEnabled &&
        presence?.buttons &&
        presence.buttons.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            {presence.buttons.map((b, i) => (
              <div
                key={i}
                className="truncate rounded-[4px] bg-[#4e5058] px-3 py-1.5 text-center text-[12px] font-medium text-white"
              >
                {b.label}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}

function ImageStack({ presence }: { presence: BuiltPresence }): JSX.Element {
  return (
    <div className="relative h-[64px] w-[64px] shrink-0">
      <PreviewImage src={presence.largeImage} className="h-[64px] w-[64px] rounded-[8px]" />
      {isUrl(presence.smallImage) && (
        <img
          src={presence.smallImage}
          alt=""
          className="absolute -bottom-1.5 -right-1.5 h-[24px] w-[24px] rounded-full bg-[#232428] ring-[3px] ring-[#232428]"
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
    return (
      <img src={src} alt="" onError={() => setOk(false)} className={`object-cover ${className}`} />
    )
  }

  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-accent to-accent-hover ${className}`}
    >
      <svg width="28" height="28" viewBox="0 0 64 64" aria-hidden>
        <polygon points="13,18 23,18 32,38 41,18 51,18 32,50" fill="#fff" fillOpacity="0.95" />
      </svg>
    </div>
  )
}

function Empty({ label }: { label: string }): JSX.Element {
  return (
    <div className="flex items-center gap-3 py-2 opacity-60">
      <div className="h-[64px] w-[64px] shrink-0 rounded-[8px] bg-[#1e1f22]" />
      <div className="flex flex-col gap-1.5">
        <div className="h-2.5 w-28 rounded bg-[#1e1f22]" />
        <div className="h-2.5 w-20 rounded bg-[#1e1f22]" />
        <div className="text-[11px] text-[#80848e]">{label}</div>
      </div>
    </div>
  )
}
