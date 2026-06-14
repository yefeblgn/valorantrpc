import { t as translate } from '@shared/i18n'
import { useStore } from '../store'


export function useT(): (key: string) => string {
  const lang = useStore((s) => s.settings?.language ?? 'en')
  return (key: string) => translate(lang, key)
}
