import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import type { JoinRequest } from '@shared/types'
import { useT } from '../lib/i18n'
import { discordAvatarUrl } from '../lib/format'
import { useNow } from '../lib/status'
import { SectionTitle } from './Card'
import { Tip } from './ui/Tip'

export function JoinRequests({ requests }: { requests: JoinRequest[] }): JSX.Element | null {
  const t = useT()
  const now = useNow(requests.length > 0)

  const active = requests.filter((r) => r.expiresAt > now)
  if (!active.length) return null

  return (
    <section>
      <SectionTitle>{t('join_requests')}</SectionTitle>
      <div className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {active.map((r) => (
            <motion.div
              key={r.id}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 12 }}
              className="panel flex items-center gap-3 border-l-[3px] border-l-discord px-3.5 py-2.5"
            >
              <Avatar url={discordAvatarUrl(r)} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold text-text">
                  {r.globalName || r.username}
                </div>
                <div className="truncate text-[12px] text-dim">{t('join_request_desc')}</div>
              </div>
              <span className="display w-7 text-right text-[14px] tabular-nums text-dim">
                {Math.max(0, Math.ceil((r.expiresAt - now) / 1000))}
              </span>
              <Tip label={t('decline')} side="top">
                <button
                  onClick={() => window.api.respondInvite(r.id, false)}
                  aria-label={t('decline')}
                  className="btn btn-ghost w-8 justify-center px-0"
                >
                  <X size={14} />
                </button>
              </Tip>
              <button
                onClick={() => window.api.respondInvite(r.id, true)}
                aria-label={t('accept')}
                className="btn btn-primary"
              >
                <Check size={14} />
                {t('accept')}
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  )
}

function Avatar({ url }: { url: string | null }): JSX.Element {
  const [ok, setOk] = useState(true)
  if (url && ok) {
    return (
      <img
        src={url}
        onError={() => setOk(false)}
        className="h-9 w-9 shrink-0 rounded-full ring-1 ring-line-2"
        alt=""
      />
    )
  }
  return <div className="h-9 w-9 shrink-0 rounded-full bg-discord/30 ring-1 ring-line-2" />
}
