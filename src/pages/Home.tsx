import { SectionTitle } from '../components/Card'
import { PlayerCard } from '../components/PlayerCard'
import { LiveMatch } from '../components/LiveMatch'
import { DiscordPreview } from '../components/DiscordPreview'
import { useStore } from '../store'
import { useT } from '../lib/i18n'

export function Home(): JSX.Element {
  const t = useT()
  const snap = useStore((s) => s.snapshot)
  const rpcEnabled = useStore((s) => s.settings?.rpcEnabled ?? true)

  if (!snap) return <div className="p-6" />

  return (
    <div className="grid grid-cols-1 gap-5 p-6 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-4">
        <PlayerCard snap={snap} />
        <div>
          <SectionTitle>{t('live_status')}</SectionTitle>
          <LiveMatch snap={snap} />
        </div>
      </div>

      <div>
        <SectionTitle>{t('live_preview')}</SectionTitle>
        <DiscordPreview presence={snap.presence} rpcEnabled={rpcEnabled} />
      </div>
    </div>
  )
}
