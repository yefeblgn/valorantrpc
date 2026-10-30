import { RTL_LANGUAGES, type Language } from './types'
import { en, type Strings } from './locales/en'
import { tr } from './locales/tr'
import { es } from './locales/es'
import { fr } from './locales/fr'
import { ja } from './locales/ja'
import { zh } from './locales/zh'
import { ar } from './locales/ar'

export const API_LANGUAGE: Record<Language, string> = {
  tr: 'tr-TR',
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  ja: 'ja-JP',
  zh: 'zh-CN',
  ar: 'ar-AE'
}

export const STRINGS: Record<Language, Strings> = { tr, en, es, fr, ja, zh, ar }

export function t(language: Language, key: string): string {
  const table: Record<string, string> = STRINGS[language] ?? en
  return table[key] ?? (en as Record<string, string>)[key] ?? key
}

export function apiLanguage(language: Language): string {
  return API_LANGUAGE[language] ?? 'en-US'
}

export function isRtl(language: Language): boolean {
  return RTL_LANGUAGES.includes(language)
}
