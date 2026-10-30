import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Braces, ChevronDown } from 'lucide-react'
import {
  DEFAULT_TEMPLATES,
  TEMPLATE_MAX,
  TEMPLATE_STATES,
  TEMPLATE_VARS,
  renderTemplate,
  type TemplateLine,
  type TemplateState,
  type TemplateValues
} from '@shared/templates'
import { useStore } from '../store'
import { useT } from '../lib/i18n'
import { Field } from './ui/Field'
import { Switch } from './ui/Switch'
import { Tip } from './ui/Tip'
import { ConfirmButton } from './ui/ConfirmButton'

type Inserter = (token: string) => void

const LINES: TemplateLine[] = ['details', 'state']

export function TemplateEditor(): JSX.Element {
  const t = useT()
  const settings = useStore((s) => s.settings)!
  const player = useStore((s) => s.snapshot?.player)
  const patch = useStore((s) => s.patch)
  const [open, setOpen] = useState(settings.templatesEnabled)
  const [hasTarget, setHasTarget] = useState(false)
  const inserter = useRef<Inserter | null>(null)

  const commit = (key: TemplateState, line: TemplateLine, value: string): void => {
    const current = useStore.getState().settings?.templates ?? DEFAULT_TEMPLATES
    void patch({ templates: { ...current, [key]: { ...current[key], [line]: value } } })
  }

  const playerId = player?.name ? `${player.name}#${player.tag}` : 'Player#0000'
  const samples = sampleValues(t, settings.streamerMode ? '' : playerId, settings.streamerMode)

  return (
    <div className="panel">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-hover"
      >
        <Braces size={16} className="shrink-0 text-dim" />
        <span className="display text-[15px] tracking-[0.08em]">{t('templates_title')}</span>
        <span className="display border border-line-2 px-1.5 py-px text-[10.5px] tracking-[0.12em] text-dim">
          {t('templates_badge')}
        </span>
        {settings.templatesEnabled && (
          <span className="display text-[11.5px] tracking-[0.12em] text-accent">{t('rpc_on')}</span>
        )}
        <ChevronDown
          size={16}
          className={`ms-auto shrink-0 text-dim transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-line">
              <p className="px-4 pt-3.5 text-[12.5px] leading-snug text-dim">
                {t('templates_desc')}
              </p>
              <Field label={t('templates_enabled')} desc={t('templates_enabled_desc')}>
                <Switch
                  checked={settings.templatesEnabled}
                  onChange={(v) => patch({ templatesEnabled: v })}
                />
              </Field>

              <div className="border-t border-line px-4 py-3.5">
                <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="label">{t('templates_vars')}</span>
                  <span className="text-[11.5px] text-dim">{t('templates_vars_hint')}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATE_VARS.map((v) => {
                    const token = `{${settings.language === 'tr' ? v.tr : v.key}}`
                    return (
                      <Tip key={v.key} label={token} desc={t(`var_${v.key}`)} side="top">
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => inserter.current?.(token)}
                          className={`h-7 border border-line-2 bg-bg px-2 font-mono text-[12px] transition-colors ${
                            hasTarget
                              ? 'text-muted hover:border-accent hover:text-text'
                              : 'cursor-default text-dim'
                          }`}
                        >
                          {token}
                        </button>
                      </Tip>
                    )
                  })}
                </div>
              </div>

              <div
                className={`divide-y divide-line border-t border-line transition-opacity ${
                  settings.templatesEnabled ? '' : 'opacity-55'
                }`}
              >
                {TEMPLATE_STATES.map((key) => {
                  const lines = settings.templates[key]
                  return (
                    <div key={key} className="px-4 py-3.5">
                      <div className="label mb-2.5 text-muted">{t(`tpl_${key}`)}</div>
                      <div className="grid gap-2.5 @xl:grid-cols-2">
                        {LINES.map((line) => (
                          <TemplateInput
                            key={line}
                            label={t(`tpl_${line}`)}
                            value={lines[line]}
                            placeholder={t('tpl_auto')}
                            onCommit={(v) => commit(key, line, v)}
                            onFocus={(insert) => {
                              inserter.current = insert
                              setHasTarget(true)
                            }}
                          />
                        ))}
                      </div>
                      <div className="mt-2.5 flex min-w-0 items-center gap-2 text-[12.5px]">
                        <span className="label shrink-0 text-[10.5px]">{t('tpl_example')}</span>
                        <span className="min-w-0 truncate">
                          <Sample
                            template={lines.details}
                            values={samples[key]}
                            auto={t('tpl_auto')}
                          />
                          <span className="px-1.5 text-dim">/</span>
                          <Sample
                            template={lines.state}
                            values={samples[key]}
                            auto={t('tpl_auto')}
                          />
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex justify-end border-t border-line px-4 py-3">
                <ConfirmButton
                  label={t('reset_default')}
                  confirmLabel={t('reset_confirm')}
                  onConfirm={() => patch({ templates: DEFAULT_TEMPLATES, templatesEnabled: false })}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Sample({
  template,
  values,
  auto
}: {
  template: string
  values: TemplateValues
  auto: string
}): JSX.Element {
  const text = template.trim() ? renderTemplate(template, values) : ''
  return text ? (
    <span className="text-text">{text}</span>
  ) : (
    <span className="italic text-dim">{auto}</span>
  )
}

function TemplateInput({
  label,
  value,
  placeholder,
  onCommit,
  onFocus
}: {
  label: string
  value: string
  placeholder: string
  onCommit: (v: string) => void
  onFocus: (insert: Inserter) => void
}): JSX.Element {
  const [local, setLocal] = useState(value)
  const input = useRef<HTMLInputElement>(null)
  const latest = useRef(value)
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null)
  const commitRef = useRef(onCommit)
  commitRef.current = onCommit

  useEffect(() => {
    if (pending.current) return
    latest.current = value
    setLocal(value)
  }, [value])

  useEffect(
    () => () => {
      if (!pending.current) return
      clearTimeout(pending.current)
      commitRef.current(latest.current)
    },
    []
  )

  const change = (next: string): void => {
    const v = next.slice(0, TEMPLATE_MAX)
    latest.current = v
    setLocal(v)
    if (pending.current) clearTimeout(pending.current)
    pending.current = setTimeout(() => {
      pending.current = null
      commitRef.current(latest.current)
    }, 400)
  }

  const insert = (token: string): void => {
    const el = input.current
    if (!el) return
    const current = latest.current
    const start = el.selectionStart ?? current.length
    const end = el.selectionEnd ?? start
    change(current.slice(0, start) + token + current.slice(end))
    const caret = Math.min(start + token.length, TEMPLATE_MAX)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(caret, caret)
    })
  }

  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[12px] text-dim">{label}</span>
      <input
        ref={input}
        value={local}
        placeholder={placeholder}
        spellCheck={false}
        maxLength={TEMPLATE_MAX}
        onFocus={() => onFocus(insert)}
        onChange={(e) => change(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
        className="input w-full"
      />
    </label>
  )
}

function sampleValues(
  t: (k: string) => string,
  player: string,
  hidden: boolean
): Record<TemplateState, TemplateValues> {
  const base: TemplateValues = {
    mode: t('sample_mode'),
    map: 'Corrode',
    agent: 'Hush',
    score: '7 - 5',
    rank: hidden ? '' : t('sample_rank'),
    rr: hidden ? '' : '47 RR',
    level: hidden ? '' : '214',
    player,
    party: '2/5',
    status: t('p_in_game')
  }
  return {
    menus: { ...base, map: '', agent: '', score: '', status: t('queuing') },
    pregame: { ...base, score: '', status: t('p_selecting_agent') },
    ingame: base,
    range: { ...base, map: t('range'), score: '', status: t('p_in_range') }
  }
}
