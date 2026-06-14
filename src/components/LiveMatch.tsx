import { motion } from 'framer-motion'
import { Gamepad2, Map as MapIcon, Swords, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Snapshot } from '@shared/types'
import { useT } from '../lib/i18n'

const STATUS_COLOR: Record<string, string> = {
  idle: '#565b70',
  menus: '#3ba55d',
  pregame: '#f0a500',
  ingame: 'var(--accent)'
}

export function LiveMatch({ snap }: { snap: Snapshot }): JSX.Element {
  const t = useT()
  const { state, display, connection } = snap
  const active = connection.valorant && state.sessionState !== 'idle'

  const statusKey = state.sessionState
  const color = display.isQueuing ? '#f0a500' : STATUS_COLOR[statusKey] ?? '#565b70'
  const labelKeys: Record<string, string> = {
    menus: 'status_menu',
    pregame: 'status_pregame',
    ingame: 'status_ingame'
  }
  const statusLabel = !active
    ? t('status_idle')
    : display.isQueuing
      ? t('queuing')
      : t(labelKeys[statusKey] ?? 'status_menu')

  const rows: { icon: ReactNode; text: string }[] = []
  if (active) {
    if (state.queueId || state.sessionState !== 'menus') {
      rows.push({
        icon: <Gamepad2 size={15} />,
        text: display.isCustom ? t('custom') : display.modeName
      })
    }
    if (display.mapName) {
      rows.push({ icon: <MapIcon size={15} />, text: `${t('map')}: ${display.mapName}` })
    }
    if (display.agentName || display.agentIcon) {
      rows.push({
        icon: display.agentIcon ? (
          <img src={display.agentIcon} className="h-[18px] w-[18px] rounded" alt="" />
        ) : (
          <Users size={15} />
        ),
        text: display.agentName || t('agent')
      })
    }
    if (state.allyScore !== null && state.enemyScore !== null) {
      rows.push({
        icon: <Swords size={15} />,
        text: `${t('score')}: ${state.allyScore} - ${state.enemyScore}`
      })
    }
    if (state.partySize > 1) {
      rows.push({
        icon: <Users size={15} />,
        text: `${t('party')}: ${state.partySize}/${state.partyMax}`
      })
    }
  }

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2.5">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: color, boxShadow: `0 0 12px ${color}` }}
        />
        <span className="text-[14px] font-semibold">{statusLabel}</span>
      </div>

      {rows.length > 0 ? (
        <div className="mt-3 flex flex-col gap-1.5">
          {rows.map((r, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-2.5 text-[12.5px] text-muted"
            >
              <span className="glass-subtle flex h-7 w-7 items-center justify-center rounded-lg text-dim">
                {r.icon}
              </span>
              {r.text}
            </motion.div>
          ))}
        </div>
      ) : (
        active && <p className="mt-2 text-[12px] text-dim">{t('waiting_match')}</p>
      )}
    </div>
  )
}
