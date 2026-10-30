import { motion } from 'framer-motion'
import {
  ChevronsLeft,
  ChevronsRight,
  Crosshair,
  Home as HomeIcon,
  Info,
  Settings as SettingsIcon
} from 'lucide-react'
import { useEffect, useState } from 'react'
import type { PageKey } from '@shared/types'
import { useStore } from '../store'
import { useT } from '../lib/i18n'
import { DiscordMark, ValorantMark } from './brand'
import { discordAvatarUrl } from '../lib/format'
import { Tip } from './ui/Tip'

export const SIDEBAR_OPEN = 208
export const SIDEBAR_CLOSED = 64

function fade(collapsed: boolean): string {
  return `transition-opacity duration-150 ${collapsed ? 'opacity-0' : 'opacity-100'}`
}

const NAV: { key: PageKey; labelKey: string; icon: typeof HomeIcon }[] = [
  { key: 'home', labelKey: 'nav_home', icon: HomeIcon },
  { key: 'match', labelKey: 'nav_match', icon: Crosshair },
  { key: 'settings', labelKey: 'nav_settings', icon: SettingsIcon },
  { key: 'about', labelKey: 'nav_about', icon: Info }
]

export function Sidebar({
  page,
  onChange,
  collapsed,
  onToggle
}: {
  page: PageKey
  onChange: (p: PageKey) => void
  collapsed: boolean
  onToggle: () => void
}): JSX.Element {
  const t = useT()
  const ToggleIcon = collapsed ? ChevronsRight : ChevronsLeft
  const toggleLabel = t(collapsed ? 'expand_menu' : 'collapse_menu')

  return (
    <motion.nav
      initial={false}
      animate={{ width: collapsed ? SIDEBAR_CLOSED : SIDEBAR_OPEN }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="flex shrink-0 flex-col justify-between overflow-clip border-e border-line bg-surface py-3"
    >
      <div className="flex flex-col gap-0.5">
        {NAV.map(({ key, labelKey, icon: Icon }) => {
          const active = page === key
          return (
            <Tip key={key} label={t(labelKey)} disabled={!collapsed}>
              <button
                onClick={() => onChange(key)}
                className={`group relative flex h-11 items-center gap-3.5 whitespace-nowrap ps-[23px] transition-colors ${
                  active ? 'text-text' : 'text-dim hover:text-muted'
                }`}
              >
                <span
                  className={`absolute inset-0 border-s-[3px] border-accent bg-gradient-to-r from-accent/15 rtl:bg-gradient-to-l to-transparent transition-opacity duration-200 ${
                    active ? 'opacity-100' : 'opacity-0'
                  }`}
                />
                <Icon size={18} className="relative z-10 shrink-0" />
                <span
                  className={`display relative z-10 text-[15px] tracking-[0.1em] ${fade(collapsed)}`}
                >
                  {t(labelKey)}
                </span>
              </button>
            </Tip>
          )
        })}
      </div>

      <div className="flex flex-col gap-3">
        <Tip label={t(collapsed ? 'expand_menu_long' : 'collapse_menu_long')} hint="Ctrl+B">
          <button
            onClick={onToggle}
            aria-label={toggleLabel}
            className="flex h-9 items-center gap-3.5 whitespace-nowrap ps-[23px] text-dim transition-colors hover:text-muted"
          >
            <ToggleIcon size={18} className="shrink-0 rtl:-scale-x-100" />
            <span className={`label text-inherit ${fade(collapsed)}`}>{toggleLabel}</span>
          </button>
        </Tip>
        <ConnectionFooter collapsed={collapsed} />
      </div>
    </motion.nav>
  )
}

function ConnectionFooter({ collapsed }: { collapsed: boolean }): JSX.Element {
  const conn = useStore((s) => s.snapshot?.connection)
  const discordUser = useStore((s) => s.snapshot?.discordUser)
  const t = useT()

  return (
    <div className="flex flex-col gap-2.5 border-t border-line pt-3">
      {discordUser && (
        <Tip
          label={discordUser.globalName || discordUser.username}
          desc={`@${discordUser.username}`}
          disabled={!collapsed}
        >
          <div className="flex items-center gap-3 whitespace-nowrap ps-4">
            <DiscordAvatar url={discordAvatarUrl(discordUser)} />
            <div className={`min-w-0 pe-3 ${fade(collapsed)}`}>
              <div className="truncate text-[13px] font-semibold text-text">
                {discordUser.globalName || discordUser.username}
              </div>
              <div className="truncate text-[11.5px] text-dim">@{discordUser.username}</div>
            </div>
          </div>
        </Tip>
      )}
      <StatusRow
        icon={<ValorantMark size={13} />}
        label="Valorant"
        connected={!!conn?.valorant}
        color="var(--accent)"
        collapsed={collapsed}
        t={t}
      />
      <StatusRow
        icon={<DiscordMark size={13} />}
        label="Discord"
        connected={!!conn?.discord}
        color="#5865f2"
        collapsed={collapsed}
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
        className="h-8 w-8 shrink-0 rounded-full ring-1 ring-line-2"
        alt=""
      />
    )
  }
  return <div className="h-8 w-8 shrink-0 rounded-full bg-discord/30 ring-1 ring-line-2" />
}

function StatusRow({
  icon,
  label,
  connected,
  color,
  collapsed,
  t
}: {
  icon: JSX.Element
  label: string
  connected: boolean
  color: string
  collapsed: boolean
  t: (k: string) => string
}): JSX.Element {
  const stateText = connected ? t('connected') : t('disconnected')
  return (
    <Tip label={label} desc={stateText} disabled={!collapsed}>
      <div className="flex items-center gap-3 whitespace-nowrap ps-5 pe-3 text-[12px]">
        <span
          className="relative flex h-6 w-6 shrink-0 items-center justify-center"
          style={{
            color: connected ? color : 'var(--color-dim)',
            background: connected
              ? `color-mix(in srgb, ${color} 16%, transparent)`
              : 'var(--color-hover)'
          }}
        >
          {icon}
          <span
            className="absolute -bottom-0.5 -end-0.5 h-1.5 w-1.5 rotate-45"
            style={{ background: connected ? 'var(--color-good)' : 'var(--color-dim)' }}
          />
        </span>
        <span className={`text-muted ${fade(collapsed)}`}>{label}</span>
        <span
          className={`display ms-auto text-[11.5px] tracking-[0.12em] ${fade(collapsed)}`}
          style={{ color: connected ? 'var(--color-good)' : 'var(--color-dim)' }}
        >
          {stateText}
        </span>
      </div>
    </Tip>
  )
}
