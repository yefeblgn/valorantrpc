export type TemplateState = 'menus' | 'pregame' | 'ingame' | 'range'
export type TemplateLine = 'details' | 'state'

export type TemplateLines = Record<TemplateLine, string>
export type PresenceTemplates = Record<TemplateState, TemplateLines>

export const TEMPLATE_STATES: TemplateState[] = ['menus', 'pregame', 'ingame', 'range']
export const TEMPLATE_MAX = 128

export const DEFAULT_TEMPLATES: PresenceTemplates = {
  menus: { details: '', state: '' },
  pregame: { details: '', state: '' },
  ingame: { details: '', state: '' },
  range: { details: '', state: '' }
}

export const TEMPLATE_VARS = [
  { key: 'mode', tr: 'mod' },
  { key: 'map', tr: 'harita' },
  { key: 'agent', tr: 'ajan' },
  { key: 'score', tr: 'skor' },
  { key: 'rank', tr: 'rank' },
  { key: 'rr', tr: 'rr' },
  { key: 'level', tr: 'seviye' },
  { key: 'player', tr: 'oyuncu' },
  { key: 'party', tr: 'parti' },
  { key: 'status', tr: 'durum' }
] as const

export type TemplateVar = (typeof TEMPLATE_VARS)[number]['key']
export type TemplateValues = Record<TemplateVar, string>

const SEPARATOR = '[·|•–-]'
const REPEATED = new RegExp(`(\\s${SEPARATOR})(?:\\s${SEPARATOR})+(?=\\s|$)`, 'g')
const LEADING = new RegExp(`^${SEPARATOR}\\s+`)
const TRAILING = new RegExp(`\\s+${SEPARATOR}$`)
const ALONE = new RegExp(`^${SEPARATOR}$`)

export function renderTemplate(template: string, values: TemplateValues): string {
  const lookup = new Map<string, string>()
  for (const v of TEMPLATE_VARS) {
    lookup.set(v.key, values[v.key])
    lookup.set(v.tr, values[v.key])
  }
  const filled = template.replace(/\{([a-zçğıöşüİ]+)\}/gi, (token, name: string) => {
    const value = lookup.get(name.toLowerCase()) ?? lookup.get(name.toLocaleLowerCase('tr'))
    return value === undefined ? token : value
  })
  return filled
    .replace(/\s+/g, ' ')
    .trim()
    .replace(REPEATED, '$1')
    .replace(LEADING, '')
    .replace(TRAILING, '')
    .replace(ALONE, '')
    .trim()
}

export function sanitizeTemplates(value: unknown): PresenceTemplates {
  const source = (value && typeof value === 'object' ? value : {}) as Record<
    string,
    Partial<Record<TemplateLine, unknown>> | undefined
  >
  const clip = (v: unknown): string => (typeof v === 'string' ? v.slice(0, TEMPLATE_MAX) : '')
  const out = {} as PresenceTemplates
  for (const key of TEMPLATE_STATES) {
    const lines = source[key] ?? {}
    out[key] = { details: clip(lines.details), state: clip(lines.state) }
  }
  return out
}
