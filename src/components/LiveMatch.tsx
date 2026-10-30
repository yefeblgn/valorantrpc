import { Gamepad2, Heart, Map as MapIcon, Swords, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Snapshot } from '@shared/types'
import { useT } from '../lib/i18n'
import { elapsed } from '../lib/format'
import { statusView, useNow } from '../lib/status'
import { ValorantMark } from './brand'
import { FadeImg } from './ui/FadeImg'

interface Tile {
  key: string
  label: string
  icon: ReactNode
  value: ReactNode
}

export function LiveMatch({ snap }: { snap: Snapshot }): JSX.Element {
  const t = useT()
  const { state, display, presence } = snap
  const status = statusView(snap, t)
  const startTs = status.active ? presence?.startTimestamp : undefined
  useNow(!!startTs)

  const tiles: Tile[] = []
  if (status.active) {
    const showMode = display.isRange ? display.isQueuing || display.isMatchFound : true
    if (showMode) {
      tiles.push({
        key: 'mode',
        label: t('mode'),
        icon: <Gamepad2 size={14} />,
        value: display.isCustom ? t('custom') : display.modeName
      })
    }
    if (display.mapName) {
      tiles.push({
        key: 'map',
        label: t('map'),
        icon: <MapIcon size={14} />,
        value: display.mapName
      })
    }
    if (display.agentName || display.agentIcon) {
      tiles.push({
        key: 'agent',
        label: t('agent'),
        icon: <Users size={14} />,
        value: (
          <span className="flex min-w-0 items-center gap-2">
            {display.agentIcon && (
              <FadeImg src={display.agentIcon} className="h-6 w-6 shrink-0 bg-bg/60" />
            )}
            <span className="truncate">{display.agentName || t('agent')}</span>
          </span>
        )
      })
    }
    if (display.score?.kind === 'health') {
      tiles.push({
        key: 'score',
        label: t('team_hp'),
        icon: <Heart size={14} />,
        value: display.score.hp
      })
    } else if (display.score && state.sessionState === 'ingame') {
      tiles.push({
        key: 'score',
        label: t('score'),
        icon: <Swords size={14} />,
        value: (
          <span className="tabular-nums">
            <span className="text-good">{display.score.ally}</span>
            <span className="px-1.5 text-dim">:</span>
            <span className="text-accent">{display.score.enemy}</span>
          </span>
        )
      })
    }
    if (state.partySize > 0) {
      tiles.push({
        key: 'party',
        label: t('party'),
        icon: <Users size={14} />,
        value: `${state.partySize} / ${state.partyMax}`
      })
    }
  }

  return (
    <div className="panel relative overflow-hidden">
      {status.active && display.mapSplash && (
        <div className="pointer-events-none absolute inset-y-0 end-0 w-3/4">
          <FadeImg src={display.mapSplash} className="h-full w-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-r from-panel via-panel/60 to-transparent rtl:bg-gradient-to-l" />
        </div>
      )}
      <div className="relative p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={`h-2.5 w-2.5 shrink-0 rotate-45 ${status.active ? 'animate-pulse-dot' : ''}`}
              style={{ background: status.color, boxShadow: `0 0 14px ${status.color}` }}
            />
            <span className="display truncate text-[26px] tracking-[0.04em]">{status.label}</span>
          </div>
          {startTs && (
            <div className="shrink-0 text-end">
              <div className="label">{t('session')}</div>
              <div className="display mt-1 text-[18px] tabular-nums text-muted">
                {elapsed(startTs)}
              </div>
            </div>
          )}
        </div>

        {status.active ? (
          tiles.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-px border border-line bg-line">
              {tiles.map((tile, i) => (
                <div
                  key={tile.key}
                  className={`min-w-0 bg-panel/95 px-3.5 py-3 ${
                    tiles.length % 2 === 1 && i === tiles.length - 1 ? 'col-span-2' : ''
                  }`}
                >
                  <div className="label flex items-center gap-1.5">
                    {tile.icon}
                    {tile.label}
                  </div>
                  <div className="display mt-1.5 truncate text-[18px] tracking-[0.03em]">
                    {tile.value}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="mt-4 flex items-center gap-4 border border-dashed border-line-2 px-4 py-3.5">
            <ValorantMark size={26} className="shrink-0 text-dim" />
            <p className="text-[13px] leading-snug text-muted">{t('waiting_hint')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
