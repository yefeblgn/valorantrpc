import { motion } from 'framer-motion'
import { Home as HomeIcon, Settings as SettingsIcon, Info } from 'lucide-react'
import { useState, useEffect } from 'react'
import type { PageKey } from '@shared/types'
import { useStore } from '../store'
import { useT } from '../lib/i18n'
import { DiscordMark, ValorantMark } from './brand'
import { discordAvatarUrl } from '../lib/format'

const NAV: { key: PageKey; labelKey: string; icon: typeof HomeIcon }[] = [
  { key: 'home', labelKey: 'nav_home', icon: HomeIcon },
  { key: 'settings', labelKey: 'nav_settings', icon: SettingsIcon },
  { key: 'about', labelKey: 'nav_about', icon: Info }
]

export function Sidebar({
  page,
  onChange
}: {
  page: PageKey
  onChange: (p: PageKey) => void
}): JSX.Element {
  const t = useT()
  return (
    <nav className="flex w-[190px] shrink-0 flex-col justify-between p-3">
      <div className="flex flex-col gap-1.5">
        {NAV.map(({ key, labelKey, icon: Icon }) => {
          const active = page === key
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className="relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium"
            >
              {active && (
                <motion.span
                  layoutId="nav-active"
                  className="glass-accent absolute inset-0 rounded-xl"
                  transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                />
              )}
              <Icon
                size={17}
                className={`relative z-10 transition-colors ${active ? 'text-white' : 'text-muted'}`}
              />
              <span
                className={`relative z-10 transition-colors ${active ? 'text-white' : 'text-muted'}`}
              >
                {t(labelKey)}
              </span>
            </button>
          )
        })}
      </div>

      <ConnectionFooter />
    </nav>
  )
}

function ConnectionFooter(): JSX.Element {
  const conn = useStore((s) => s.snapshot?.connection)
  const discordUser = useStore((s) => s.snapshot?.discordUser)
  const t = useT()
  const avatar = discordAvatarUrl(discordUser)

  return (
    <div className="glass flex flex-col gap-3 rounded-2xl p-3">
      {discordUser && (
        <div className="flex items-center gap-2.5 border-b border-white/6 pb-3">
          <DiscordAvatar url={avatar} />
          <div className="min-w-0">
            <div className="truncate text-[12px] font-semibold text-text">
              {discordUser.globalName || discordUser.username}
            </div>
            <div className="truncate text-[10.5px] text-dim">@{discordUser.username}</div>
          </div>
        </div>
      )}
      <StatusRow
        icon={<ValorantMark size={14} />}
        label="Valorant"
        connected={!!conn?.valorant}
        color="var(--accent)"
        t={t}
      />
      <StatusRow
        icon={<DiscordMark size={14} />}
        label="Discord"
        connected={!!conn?.discord}
        color="#5865f2"
        t={t}
      />
    </div>
  )
}

function DiscordAvatar({ url }: { url: string | null }): JSX.Element {
  const [ok, setOk] = useState(true)

  useEffect(() => {
    setOk(true)
  }, [url])

  if (url && ok) {
    return (
      <img
        src={url}
        onError={() => setOk(false)}
        className="h-8 w-8 rounded-full ring-1 ring-white/10"
        alt=""
      />
    )
  }
  return <div className="h-8 w-8 rounded-full bg-discord/30 ring-1 ring-white/10" />
}

function StatusRow({
  icon,
  label,
  connected,
  color,
  t
}: {
  icon: JSX.Element
  label: string
  connected: boolean
  color: string
  t: (k: string) => string
}): JSX.Element {
  return (
    <div className="flex items-center gap-2.5 text-[11px]">
      <span
        className="flex h-6 w-6 items-center justify-center rounded-lg"
        style={{
          color: connected ? color : 'var(--color-dim)',
          background: connected ? `color-mix(in srgb, ${color} 16%, transparent)` : 'rgba(255,255,255,0.03)'
        }}
      >
        {icon}
      </span>
      <span className="text-muted">{label}</span>
      <span
        className="ml-auto flex items-center gap-1.5 font-medium"
        style={{ color: connected ? 'var(--color-good)' : 'var(--color-dim)' }}
      >
        {connected && <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-good" />}
        {connected ? t('connected') : t('disconnected')}
      </span>
    </div>
  )
}
