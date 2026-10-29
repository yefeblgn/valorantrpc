import { useEffect, useState } from 'react'
import { Bug, Github, Heart } from 'lucide-react'
import { useT } from '../lib/i18n'
import { UpdatePanel } from '../components/UpdatePanel'
import { PageHeader, SectionTitle } from '../components/Card'
import { AppLogo, STUDIO, StudioMark, StudioTag } from '../components/brand'

const GITHUB_URL = 'https://github.com/yefeblgn/valorantrpc'

export function About(): JSX.Element {
  const t = useT()
  const [version, setVersion] = useState('')
  useEffect(() => {
    void window.api.getVersion().then(setVersion)
  }, [])

  return (
    <div className="flex max-w-[680px] flex-col gap-5 p-6">
      <PageHeader title={t('nav_about')} />

      <div className="panel ticks p-6">
        <div className="flex items-center gap-4">
          <AppLogo size={58} />
          <div>
            <div className="display text-[36px] tracking-[0.04em]">
              Valorant<span className="text-accent">RPC</span>
            </div>
            <StudioTag size={16} className="mt-1" />
            <div className="mt-2 flex items-center gap-2.5 text-[13px] text-muted">
              <span className="display border border-line-2 px-1.5 py-0.5 text-[12px] normal-case tracking-[0.1em] text-text">
                v{version}
              </span>
              {t('about_tagline')}
            </div>
          </div>
        </div>
        <p className="mt-5 text-[14px] leading-relaxed text-muted">{t('about_desc')}</p>
        <div className="mt-5 flex gap-2.5">
          <button onClick={() => window.api.openExternal(GITHUB_URL)} className="btn btn-ghost">
            <Github size={14} />
            {t('github')}
          </button>
          <button
            onClick={() => window.api.openExternal(`${GITHUB_URL}/issues`)}
            className="btn btn-ghost"
          >
            <Bug size={14} />
            {t('issues')}
          </button>
        </div>
      </div>

      <section>
        <SectionTitle>{t('tab_updates')}</SectionTitle>
        <UpdatePanel />
      </section>

      <div className="flex items-center gap-2.5 text-[12.5px] text-dim">
        <StudioMark size={18} className="opacity-70" />
        <span>
          © 2026 {STUDIO} · Made by{' '}
          <Heart size={12} className="inline text-accent" fill="currentColor" /> yefeblgn · MIT
          License
        </span>
      </div>
    </div>
  )
}
