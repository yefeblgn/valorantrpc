import { Eye, EyeOff } from 'lucide-react'
import { SectionTitle } from '../components/Card'
import { PlayerCard } from '../components/PlayerCard'
import { LiveMatch } from '../components/LiveMatch'
import { DiscordPreview } from '../components/DiscordPreview'
import { JoinRequests } from '../components/JoinRequests'
import { Switch } from '../components/ui/Switch'
import { Tip } from '../components/ui/Tip'
import { useStore } from '../store'
import { useT } from '../lib/i18n'

export function Home(): JSX.Element {
  const t = useT()
  const snap = useStore((s) => s.snapshot)
  const rpcEnabled = useStore((s) => s.settings?.rpcEnabled ?? true)
  const streamer = useStore((s) => s.settings?.streamerMode ?? false)
  const patch = useStore((s) => s.patch)

  if (!snap) return <div className="p-6" />

  return (
    <div className="flex flex-col gap-5 p-6">
      <PlayerCard snap={snap} />
      <JoinRequests requests={snap.joinRequests} />
      <div className="grid grid-cols-1 gap-5 @2xl:grid-cols-[minmax(0,1fr)_288px]">
        <section className="min-w-0">
          <SectionTitle>{t('live_status')}</SectionTitle>
          <LiveMatch snap={snap} />
        </section>
        <section className="min-w-0">
          <SectionTitle
            action={
              <>
                <Tip
                  label={t(streamer ? 'streamer_on' : 'streamer_off')}
                  desc={t('streamer_mode_desc')}
                  side="top"
                >
                  <button
                    onClick={() => void patch({ streamerMode: !streamer })}
                    aria-pressed={streamer}
                    aria-label={t('streamer_mode')}
                    className={`me-1 flex h-6 w-6 items-center justify-center border transition-colors ${
                      streamer
                        ? 'border-accent bg-accent/15 text-accent'
                        : 'border-line-2 text-dim hover:border-dim hover:text-muted'
                    }`}
                  >
                    {streamer ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </Tip>
                <span className="label">{rpcEnabled ? t('rpc_on') : t('rpc_off')}</span>
                <Switch
                  checked={rpcEnabled}
                  onChange={(v) => void patch({ rpcEnabled: v })}
                  label={t('rpc_enabled')}
                />
              </>
            }
          >
            {t('live_preview')}
          </SectionTitle>
          <DiscordPreview presence={snap.presence} rpcEnabled={rpcEnabled} />
        </section>
      </div>
    </div>
  )
}
