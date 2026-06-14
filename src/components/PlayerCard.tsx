import { useState } from 'react'
import type { Snapshot } from '@shared/types'
import { useT } from '../lib/i18n'

export function PlayerCard({ snap }: { snap: Snapshot }): JSX.Element {
  const t = useT()
  const [bannerOk, setBannerOk] = useState(true)
  const { player, state, display } = snap
  const hasPlayer = !!player.name
  const ranked = state.competitiveTier > 0

  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="relative h-28">
        {display.cardWide && bannerOk ? (
          <img
            src={display.cardWide}
            onError={() => setBannerOk(false)}
            className="h-full w-full object-cover"
            alt=""
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-accent/25 to-transparent" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0d] via-[#0a0a0d]/30 to-transparent" />
      </div>

      <div className="px-5 pb-4 pt-3">
        <div className="text-[16px] font-bold">
          {hasPlayer ? (
            <>
              {player.name}
              <span className="text-muted">#{player.tag}</span>
            </>
          ) : (
            <span className="text-muted">{t('no_player')}</span>
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          {ranked && display.tierIcon && (
            <img src={display.tierIcon} className="h-5 w-5" alt="" />
          )}
          <span className="text-[12px] text-muted">
            {ranked ? display.tierName : t('unranked')}
            {ranked && state.rr !== null && (
              <span className="text-dim"> · {state.rr} RR</span>
            )}
          </span>
        </div>
      </div>
    </div>
  )
}
