import { useEffect, useState } from 'react'
import { apiLanguage, isRtl } from '@shared/i18n'
import { useStore } from '../store'
import { darken } from './format'

const DARK_QUERY = '(prefers-color-scheme: dark)'

export function useResolvedTheme(): 'dark' | 'light' {
  const theme = useStore((s) => s.settings?.theme ?? 'dark')
  const [systemDark, setSystemDark] = useState(() => window.matchMedia(DARK_QUERY).matches)

  useEffect(() => {
    const query = window.matchMedia(DARK_QUERY)
    const onChange = (e: MediaQueryListEvent): void => setSystemDark(e.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  if (theme === 'system') return systemDark ? 'dark' : 'light'
  return theme
}

export function useAppearance({ themed = true }: { themed?: boolean } = {}): void {
  const accent = useStore((s) => s.settings?.accentColor ?? '#ff4655')
  const language = useStore((s) => s.settings?.language ?? 'en')
  const bold = useStore((s) => s.settings?.boldText ?? false)
  const contrast = useStore((s) => s.settings?.highContrast ?? false)
  const reduceMotion = useStore((s) => s.settings?.reduceMotion ?? false)
  const theme = useResolvedTheme()

  useEffect(() => {
    const root = document.documentElement
    root.lang = language === 'zh' ? apiLanguage(language) : language
    root.dir = isRtl(language) ? 'rtl' : 'ltr'
  }, [language])

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--color-accent', accent)
    root.style.setProperty('--accent', accent)
    root.style.setProperty('--color-accent-hover', darken(accent, 0.12))
    root.style.setProperty('--accent-hover', darken(accent, 0.12))
  }, [accent])

  useEffect(() => {
    if (themed) document.documentElement.dataset.theme = theme
  }, [themed, theme])

  useEffect(() => {
    const root = document.documentElement.classList
    root.toggle('a11y-bold', bold)
    root.toggle('a11y-contrast', contrast)
    root.toggle('a11y-reduce-motion', reduceMotion)
  }, [bold, contrast, reduceMotion])
}
