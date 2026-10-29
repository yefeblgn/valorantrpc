import type { Snapshot } from '@shared/types'
import { useT } from '../lib/i18n'
import { FadeImg } from './ui/FadeImg'

export function PlayerCard({ snap }: { snap: Snapshot }): JSX.Element {
  const t = useT()
  const { player, state, display } = snap
  const hasPlayer = !!player.name
  const ranked = state.competitiveTier > 0

  return (
    <div className="panel ticks relative h-[148px] overflow-hidden">
      {display.cardWide && (
        <FadeImg
          src={display.cardWide}
          className="absolute inset-0 h-full w-full object-cover object-[center_35%] opacity-80"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-panel via-panel/80 to-panel/50" />
      <div className="absolute inset-y-0 right-0 w-2/5 bg-gradient-to-l from-panel/95 via-panel/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-panel/80 to-transparent" />

      <div className="relative flex h-full items-end justify-between gap-4 p-5">
        <div className="flex min-w-0 items-center gap-4">
          <div className="h-[76px] w-[76px] shrink-0 border border-line-2 bg-panel-2">
            {display.cardSquare && (
              <FadeImg src={display.cardSquare} className="h-full w-full object-cover" />
            )}
          </div>
          <div className="min-w-0">
            <div className="label mb-2">{t('player')}</div>
            {hasPlayer ? (
              <div className="display truncate text-[30px] normal-case tracking-[0.03em]">
                {player.name}
                <span className="text-dim">#{player.tag}</span>
              </div>
            ) : (
              <div className="display text-[26px] text-dim">{t('no_player')}</div>
            )}
            {state.accountLevel > 0 && (
              <div className="mt-2.5 inline-flex h-6 items-center gap-2 border border-line-2 bg-bg/60 px-2">
                <span className="label text-[10.5px]">{t('level')}</span>
                <span className="display text-[14px]">{state.accountLevel}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3 text-right">
          <div>
            <div className="label mb-1.5">{t('rank')}</div>
            <div className="display text-[20px]">{ranked ? display.tierName : t('unranked')}</div>
            {ranked && state.rr !== null && (
              <div className="mt-1 text-[12.5px] font-semibold text-muted">
                {state.rr} <span className="text-dim">RR</span>
              </div>
            )}
          </div>
          {ranked && display.tierIcon && <FadeImg src={display.tierIcon} className="h-14 w-14" />}
        </div>
      </div>
    </div>
  )
}
