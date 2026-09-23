import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import type { JoinRequest } from '@shared/types'
import { useT } from '../lib/i18n'
import { discordAvatarUrl } from '../lib/format'

export function JoinRequests({ requests }: { requests: JoinRequest[] }): JSX.Element | null {
  const t = useT()
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!requests.length) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [requests.length])

  const active = requests.filter((r) => r.expiresAt > now)
  if (!active.length) return null

  return (
    <div className="glass-accent rounded-2xl p-3">
      <div className="mb-2 px-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted">
        {t('join_requests')}
      </div>
      <div className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {active.map((r) => (
            <motion.div
              key={r.id}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 12 }}
              className="glass-subtle flex items-center gap-3 rounded-xl px-3 py-2"
            >
              <Avatar url={discordAvatarUrl(r)} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-semibold text-text">
                  {r.globalName || r.username}
                </div>
                <div className="truncate text-[11px] text-dim">{t('join_request_desc')}</div>
              </div>
              <span className="w-6 text-right text-[11px] tabular-nums text-dim">
                {Math.max(0, Math.ceil((r.expiresAt - now) / 1000))}
              </span>
              <button
                onClick={() => window.api.respondInvite(r.id, false)}
                aria-label={t('decline')}
                title={t('decline')}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition hover:bg-white/8 hover:text-white"
              >
                <X size={14} />
              </button>
              <button
                onClick={() => window.api.respondInvite(r.id, true)}
                aria-label={t('accept')}
                title={t('accept')}
                className="flex h-7 items-center gap-1 rounded-lg bg-accent px-2.5 text-[12px] font-semibold text-white transition hover:bg-accent-hover"
              >
                <Check size={13} />
                {t('accept')}
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

function Avatar({ url }: { url: string | null }): JSX.Element {
  const [ok, setOk] = useState(true)
  if (url && ok) {
    return (
      <img
        src={url}
        onError={() => setOk(false)}
        className="h-8 w-8 shrink-0 rounded-full ring-1 ring-white/10"
        alt=""
      />
    )
  }
  return <div className="h-8 w-8 shrink-0 rounded-full bg-discord/30 ring-1 ring-white/10" />
}
