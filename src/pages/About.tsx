import { useEffect, useState } from 'react'
import { Github, Bug, Heart } from 'lucide-react'
import { useT } from '../lib/i18n'
import { UpdatePanel } from '../components/UpdatePanel'

const GITHUB_URL = 'https://github.com/yefeblgn/valorantrpc'

export function About(): JSX.Element {
  const t = useT()
  const [version, setVersion] = useState('')
  useEffect(() => {
    void window.api.getVersion().then(setVersion)
  }, [])

  return (
    <div className="flex max-w-[600px] flex-col gap-5 p-6">
      <div className="flex items-center gap-4">
        <svg width="52" height="52" viewBox="0 0 100 100" aria-hidden>
          <circle cx="50" cy="50" r="48" fill="var(--accent)" />
          <polygon points="25,26 34,26 44,52 44,78" fill="#fff" fillOpacity="0.95" />
          <polygon points="75,26 66,26 56,52 56,78" fill="#fff" fillOpacity="0.95" />
        </svg>
        <div>
          <div className="text-xl font-bold">
            Valorant<span className="text-accent">RPC</span>
          </div>
          <div className="mt-0.5 text-[12px] text-muted">
            v{version} · {t('about_tagline')}
          </div>
        </div>
      </div>

      <p className="text-[13px] leading-relaxed text-muted">{t('about_desc')}</p>

      <UpdatePanel />

      <div className="flex gap-2.5">
        <LinkButton
          icon={<Github size={15} />}
          label={t('github')}
          onClick={() => window.api.openExternal(GITHUB_URL)}
        />
        <LinkButton
          icon={<Bug size={15} />}
          label={t('issues')}
          onClick={() => window.api.openExternal(`${GITHUB_URL}/issues`)}
        />
      </div>

      <div className="flex items-center gap-1.5 text-[11.5px] text-dim">
        Made by <Heart size={12} className="text-accent" fill="currentColor" /> yefeblgn · MIT
        License
      </div>
    </div>
  )
}

function LinkButton({
  icon,
  label,
  onClick
}: {
  icon: JSX.Element
  label: string
  onClick: () => void
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className="glass-subtle glass-hover flex items-center gap-2 rounded-xl px-3.5 py-2 text-[12.5px] font-medium text-muted transition hover:text-white"
    >
      {icon}
      {label}
    </button>
  )
}
