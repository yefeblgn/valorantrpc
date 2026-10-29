import { useEffect, useRef, useState, type ReactNode } from 'react'
import * as RTabs from '@radix-ui/react-tabs'
import { motion } from 'framer-motion'
import { Check, Lock } from 'lucide-react'
import {
  DEFAULT_SETTINGS,
  type AgentOption,
  type LargeImageMode,
  type LargeTextMode,
  type Language,
  type Settings as AppSettings,
  type SmallImageMode,
  type SmallTextMode,
  type ThemeMode,
  type UiScale,
  type WindowInfo,
  type WindowSizeKey,
  UI_SCALES,
  WINDOW_SIZES
} from '@shared/types'
import { useStore } from '../store'
import { useT } from '../lib/i18n'
import { PageHeader } from '../components/Card'
import { Field } from '../components/ui/Field'
import { Switch } from '../components/ui/Switch'
import { Select, type Option } from '../components/ui/Select'
import { Slider } from '../components/ui/Slider'
import { Segmented } from '../components/ui/Segmented'
import { Tip } from '../components/ui/Tip'
import { ConfirmButton } from '../components/ui/ConfirmButton'
import { DiscordPreview } from '../components/DiscordPreview'
import { TemplateEditor } from '../components/TemplateEditor'
import { UpdatePanel } from '../components/UpdatePanel'
import { HotkeyRecorder } from '../components/ui/HotkeyRecorder'
import { RiskNote } from './Match'
import { darken } from '../lib/format'

const ACCENTS = ['#ff4655', '#5a9cff', '#3ecf8e', '#b66dff', '#ff8a3d', '#ffce47']

const PRESENCE_KEYS = [
  'showElapsed',
  'showParty',
  'showRank',
  'showLevel',
  'showScore',
  'showButton',
  'buttonLabel',
  'buttonUrl',
  'discordInvites',
  'streamerMode',
  'largeImage',
  'largeText',
  'smallImage',
  'smallText',
  'templatesEnabled',
  'templates'
] as const satisfies readonly (keyof AppSettings)[]

function presenceDefaults(): Partial<AppSettings> {
  return Object.fromEntries(PRESENCE_KEYS.map((k) => [k, DEFAULT_SETTINGS[k]]))
}

const TABS = ['general', 'presence', 'overlay', 'autolock', 'appearance', 'updates'] as const
type Tab = (typeof TABS)[number]

export function Settings(): JSX.Element {
  const t = useT()
  const [tab, setTab] = useState<Tab>('general')

  return (
    <div className="p-6">
      <PageHeader title={t('nav_settings')} desc={t('settings_desc')} />
      <RTabs.Root value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <RTabs.List className="mb-5 flex flex-wrap gap-x-6 border-b border-line">
          {TABS.map((tb) => (
            <RTabs.Trigger
              key={tb}
              value={tb}
              className="display relative shrink-0 pb-2.5 text-[15px] tracking-[0.1em] text-dim outline-none transition-colors hover:text-muted data-[state=active]:text-text"
            >
              {t(`tab_${tb}`)}
              <span
                className={`absolute inset-x-0 -bottom-px h-[2px] origin-left bg-accent transition-transform duration-200 ease-out ${
                  tab === tb ? 'scale-x-100' : 'scale-x-0'
                }`}
              />
            </RTabs.Trigger>
          ))}
        </RTabs.List>

        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          {tab === 'general' && <GeneralTab />}
          {tab === 'presence' && <PresenceTab />}
          {tab === 'autolock' && <AutolockTab />}
          {tab === 'appearance' && <AppearanceTab />}
          {tab === 'overlay' && <OverlayTab />}
          {tab === 'updates' && <UpdatePanel />}
        </motion.div>
      </RTabs.Root>
    </div>
  )
}

function useSettings() {
  const settings = useStore((s) => s.settings)!
  const patch = useStore((s) => s.patch)
  return { settings, patch }
}

function Group({ title, children }: { title?: string; children: ReactNode }): JSX.Element {
  return (
    <div className="panel">
      {title && <div className="label border-b border-line px-4 py-2.5">{title}</div>}
      <div className="divide-y divide-line">{children}</div>
    </div>
  )
}

function GeneralTab(): JSX.Element {
  const t = useT()
  const { settings, patch } = useSettings()
  const [localInterval, setLocalInterval] = useState(settings.pollInterval)

  useEffect(() => {
    setLocalInterval(settings.pollInterval)
  }, [settings.pollInterval])

  return (
    <div className="flex flex-col gap-5">
      <Group title={t('group_app')}>
        <Field label={t('rpc_enabled')} desc={t('rpc_enabled_desc')}>
          <Switch checked={settings.rpcEnabled} onChange={(v) => patch({ rpcEnabled: v })} />
        </Field>
        <Field label={t('language')} desc={t('language_desc')}>
          <Segmented<Language>
            value={settings.language}
            options={[
              { value: 'tr', label: 'TR' },
              { value: 'en', label: 'EN' }
            ]}
            onChange={(v) => patch({ language: v, languageDetected: true })}
          />
        </Field>
        <Field label={t('poll_interval')} desc={t('poll_interval_desc')}>
          <div className="flex items-center gap-3">
            <Slider
              value={localInterval}
              onChange={setLocalInterval}
              onCommit={(v) => patch({ pollInterval: v })}
            />
            <span className="display w-8 text-right text-[15px] text-muted">{localInterval}s</span>
          </div>
        </Field>
        <Field label={t('notify_detect')} desc={t('notify_detect_desc')}>
          <Switch
            checked={settings.notifyOnDetect}
            onChange={(v) => patch({ notifyOnDetect: v })}
          />
        </Field>
      </Group>

      <Group title={t('group_startup')}>
        <Field label={t('autostart')} desc={t('autostart_desc')}>
          <Switch checked={settings.autostart} onChange={(v) => patch({ autostart: v })} />
        </Field>
        <Field label={t('start_minimized')} desc={t('start_minimized_desc')}>
          <Switch
            checked={settings.startMinimized}
            onChange={(v) => patch({ startMinimized: v })}
          />
        </Field>
        <Field label={t('close_to_tray')} desc={t('close_to_tray_desc')}>
          <Switch checked={settings.closeToTray} onChange={(v) => patch({ closeToTray: v })} />
        </Field>
        <Field label={t('auto_check_updates')} desc={t('auto_check_updates_desc')}>
          <Switch
            checked={settings.autoCheckUpdates}
            onChange={(v) => patch({ autoCheckUpdates: v })}
          />
        </Field>
      </Group>
    </div>
  )
}

function PresenceTab(): JSX.Element {
  const t = useT()
  const { settings, patch } = useSettings()
  const snap = useStore((s) => s.snapshot)

  const imgOpt = (keys: string[]): Option[] =>
    keys.map((k) => ({ value: k, label: t(IMG_LABEL[k]) }))
  const txtOpt = (keys: string[]): Option[] =>
    keys.map((k) => ({ value: k, label: t(TXT_LABEL[k]) }))
  const urlInvalid = !!settings.buttonUrl && !/^https?:\/\/[^\s]+$/i.test(settings.buttonUrl)

  return (
    <div className="grid grid-cols-1 gap-5 @3xl:grid-cols-[minmax(0,1fr)_288px]">
      <div className="flex min-w-0 flex-col gap-5">
        <Group title={t('group_privacy')}>
          <Field label={t('streamer_mode')} desc={t('streamer_mode_desc')}>
            <Switch checked={settings.streamerMode} onChange={(v) => patch({ streamerMode: v })} />
          </Field>
        </Group>

        <Group title={t('presence_display')}>
          <Field label={t('show_rank')}>
            <Switch checked={settings.showRank} onChange={(v) => patch({ showRank: v })} />
          </Field>
          <Field label={t('show_level')}>
            <Switch checked={settings.showLevel} onChange={(v) => patch({ showLevel: v })} />
          </Field>
          <Field label={t('show_score')}>
            <Switch checked={settings.showScore} onChange={(v) => patch({ showScore: v })} />
          </Field>
          <Field label={t('show_party')}>
            <Switch checked={settings.showParty} onChange={(v) => patch({ showParty: v })} />
          </Field>
          <Field label={t('show_elapsed')}>
            <Switch checked={settings.showElapsed} onChange={(v) => patch({ showElapsed: v })} />
          </Field>
        </Group>

        <Group title={t('presence_slots')}>
          <Field label={t('large_image')}>
            <Select
              value={settings.largeImage}
              onChange={(v) => patch({ largeImage: v as LargeImageMode })}
              options={imgOpt(['auto', 'map', 'agent', 'rank', 'playercard'])}
            />
          </Field>
          <Field label={t('large_text')}>
            <Select
              value={settings.largeText}
              onChange={(v) => patch({ largeText: v as LargeTextMode })}
              options={txtOpt(['auto', 'playerName', 'level', 'mode', 'mapName'])}
            />
          </Field>
          <Field label={t('small_image')}>
            <Select
              value={settings.smallImage}
              onChange={(v) => patch({ smallImage: v as SmallImageMode })}
              options={imgOpt(['auto', 'agent', 'rank', 'mode', 'playercard', 'map', 'none'])}
            />
          </Field>
          <Field label={t('small_text')}>
            <Select
              value={settings.smallText}
              onChange={(v) => patch({ smallText: v as SmallTextMode })}
              options={txtOpt([
                'auto',
                'agentName',
                'score',
                'rank',
                'mode',
                'playerName',
                'level'
              ])}
            />
          </Field>
        </Group>

        <Group title={t('group_buttons')}>
          <Field label={t('discord_invites')} desc={t('discord_invites_desc')}>
            <Switch
              checked={settings.discordInvites}
              onChange={(v) => patch({ discordInvites: v })}
            />
          </Field>
          <Field label={t('show_button')}>
            <Switch checked={settings.showButton} onChange={(v) => patch({ showButton: v })} />
          </Field>
          {settings.showButton && (
            <>
              <Field label={t('button_label')}>
                <TextInput
                  value={settings.buttonLabel}
                  maxLength={32}
                  onChange={(v) => patch({ buttonLabel: v })}
                />
              </Field>
              <Field
                label={t('button_url')}
                desc={urlInvalid ? t('button_url_invalid') : undefined}
                descTone={urlInvalid ? 'error' : 'default'}
              >
                <TextInput
                  value={settings.buttonUrl}
                  invalid={urlInvalid}
                  onChange={(v) => patch({ buttonUrl: v })}
                  width={220}
                />
              </Field>
            </>
          )}
        </Group>

        <TemplateEditor />

        <Group>
          <Field label={t('reset_presence')} desc={t('reset_presence_desc')}>
            <ConfirmButton
              label={t('reset_default')}
              confirmLabel={t('reset_confirm')}
              onConfirm={() => patch(presenceDefaults())}
            />
          </Field>
        </Group>
      </div>

      <div className="@3xl:sticky @3xl:top-0 @3xl:self-start">
        <div className="label mb-2.5">{t('live_preview')}</div>
        <DiscordPreview presence={snap?.presence ?? null} rpcEnabled={settings.rpcEnabled} />
      </div>
    </div>
  )
}

function AutolockTab(): JSX.Element {
  const t = useT()
  const { settings, patch } = useSettings()
  const [agents, setAgents] = useState<AgentOption[] | null>(null)

  useEffect(() => {
    void window.api.getAgents().then(setAgents)
  }, [])

  const selected = agents?.find((a) => a.uuid === settings.autolockAgent) ?? null

  return (
    <div className="flex flex-col gap-5">
      <Group>
        <Field label={t('autolock_enabled')} desc={t('autolock_desc')}>
          <Switch
            checked={settings.autolockEnabled}
            onChange={(v) => patch({ autolockEnabled: v })}
          />
        </Field>
      </Group>

      <div className="panel">
        <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <div className="label">{t('autolock_agent')}</div>
            <div className="mt-1 text-[12.5px] text-dim">{t('autolock_agent_desc')}</div>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            {selected ? (
              <>
                <img src={selected.icon} className="h-8 w-8 border border-line-2" alt="" />
                <div className="text-right">
                  <div className="display text-[18px]">{selected.name}</div>
                  <div className="text-[11.5px] text-dim">{selected.role}</div>
                </div>
              </>
            ) : (
              <span className="text-[13px] text-dim">{t('autolock_none')}</span>
            )}
          </div>
        </div>

        <div
          className={`grid grid-cols-[repeat(auto-fill,minmax(78px,1fr))] gap-2 p-4 transition-opacity ${
            settings.autolockEnabled ? '' : 'opacity-60'
          }`}
        >
          {agents === null
            ? Array.from({ length: 12 }, (_, i) => (
                <div key={i} className="aspect-[4/5] animate-pulse bg-panel-2" />
              ))
            : agents.map((a) => (
                <AgentTile
                  key={a.uuid}
                  agent={a}
                  selected={a.uuid === settings.autolockAgent}
                  newLabel={t('new_badge')}
                  onPick={() =>
                    patch({ autolockAgent: a.uuid === settings.autolockAgent ? '' : a.uuid })
                  }
                />
              ))}
        </div>
      </div>
    </div>
  )
}

function AgentTile({
  agent,
  selected,
  newLabel,
  onPick
}: {
  agent: AgentOption
  selected: boolean
  newLabel: string
  onPick: () => void
}): JSX.Element {
  return (
    <Tip label={agent.name} desc={agent.role || undefined} side="top">
      <button
        onClick={onPick}
        className={`group relative flex flex-col overflow-hidden border text-left transition-colors ${
          selected ? 'border-accent' : 'border-line hover:border-line-2'
        }`}
      >
        <div
          className={`relative aspect-square w-full overflow-hidden ${
            selected ? 'bg-accent/20' : 'bg-panel-2'
          }`}
        >
          <img
            src={agent.icon}
            loading="lazy"
            decoding="async"
            className={`h-full w-full object-cover transition duration-200 group-hover:scale-105 ${
              selected ? '' : 'grayscale-[35%] group-hover:grayscale-0'
            }`}
            alt=""
          />
          {selected && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center bg-accent text-white">
              <Lock size={10} />
            </span>
          )}
          {agent.isNew && (
            <span className="display absolute left-0 top-0 bg-accent px-1.5 py-[3px] text-[10.5px] tracking-[0.12em] text-white">
              {newLabel}
            </span>
          )}
        </div>
        <span
          className={`display truncate px-1.5 py-1.5 text-center text-[13px] tracking-[0.06em] ${
            selected ? 'bg-accent text-white' : 'bg-panel text-muted group-hover:text-text'
          }`}
        >
          {agent.name}
        </span>
      </button>
    </Tip>
  )
}

function applyAccent(color: string): void {
  const root = document.documentElement
  root.style.setProperty('--color-accent', color)
  root.style.setProperty('--accent', color)
  root.style.setProperty('--color-accent-hover', darken(color, 0.12))
  root.style.setProperty('--accent-hover', darken(color, 0.12))
}

function OverlayTab(): JSX.Element {
  const t = useT()
  const { settings, patch } = useSettings()
  const [hotkeyOk, setHotkeyOk] = useState(true)

  useEffect(() => {
    void window.api.getHotkeyStatus().then(setHotkeyOk)
  }, [settings.overlayHotkey, settings.overlayEnabled])

  return (
    <div className="flex flex-col gap-5">
      <Group>
        <Field label={t('overlay_enabled')} desc={t('overlay_enabled_desc')}>
          <Switch
            checked={settings.overlayEnabled}
            onChange={(v) => patch({ overlayEnabled: v })}
          />
        </Field>
        <Field
          label={t('overlay_hotkey')}
          desc={hotkeyOk ? t('overlay_hotkey_desc') : t('hotkey_taken')}
          descTone={hotkeyOk ? 'default' : 'error'}
        >
          <HotkeyRecorder
            value={settings.overlayHotkey}
            disabled={!settings.overlayEnabled}
            onChange={(v) => patch({ overlayHotkey: v })}
          />
        </Field>
        <Field label={t('overlay_test')} desc={t('overlay_test_desc')}>
          <button
            onClick={() => window.api.toggleOverlay()}
            disabled={!settings.overlayEnabled}
            className="btn btn-ghost"
          >
            {t('overlay_show')}
          </button>
        </Field>
      </Group>
      <RiskNote />
      <p className="text-[12.5px] leading-snug text-dim">
        {t('overlay_borderless')} {t('overlay_privacy')}
      </p>
    </div>
  )
}

function AppearanceTab(): JSX.Element {
  const t = useT()
  const { settings, patch } = useSettings()
  const [color, setColor] = useState(settings.accentColor)
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setColor(settings.accentColor)
  }, [settings.accentColor])

  useEffect(
    () => () => {
      if (commitTimer.current) clearTimeout(commitTimer.current)
    },
    []
  )

  const pick = (next: string, immediate = false): void => {
    setColor(next)
    applyAccent(next)
    if (commitTimer.current) clearTimeout(commitTimer.current)
    if (immediate) void patch({ accentColor: next })
    else commitTimer.current = setTimeout(() => void patch({ accentColor: next }), 300)
  }

  const [windowInfo, setWindowInfo] = useState<WindowInfo | null>(null)
  useEffect(() => {
    void window.api.getWindowInfo().then(setWindowInfo)
  }, [])

  const sizeText = (key: Exclude<WindowSizeKey, 'auto'>): string =>
    `${WINDOW_SIZES[key][0]} × ${WINDOW_SIZES[key][1]}`
  const sizeOptions: Option[] = [
    {
      value: 'auto',
      label: windowInfo ? `${t('window_auto')} · ${sizeText(windowInfo.auto)}` : t('window_auto')
    },
    ...(Object.keys(WINDOW_SIZES) as Exclude<WindowSizeKey, 'auto'>[]).map((key) => {
      const fits = !windowInfo || windowInfo.fits.includes(key)
      return {
        value: key,
        label: fits ? sizeText(key) : `${sizeText(key)} · ${t('window_too_big')}`,
        disabled: !fits
      }
    })
  ]

  return (
    <div className="flex flex-col gap-5">
      <Group title={t('group_theme')}>
        <Field label={t('theme')} desc={t('theme_desc')}>
          <Segmented<ThemeMode>
            value={settings.theme}
            options={[
              { value: 'dark', label: t('theme_dark') },
              { value: 'light', label: t('theme_light') },
              { value: 'system', label: t('theme_system') }
            ]}
            onChange={(v) => patch({ theme: v })}
          />
        </Field>
        <Field label={t('accent_color')} desc={t('accent_color_desc')}>
          <div className="flex items-center gap-2">
            {ACCENTS.map((c) => {
              const active = color.toLowerCase() === c.toLowerCase()
              return (
                <button
                  key={c}
                  onClick={() => pick(c, true)}
                  className={`flex h-7 w-7 items-center justify-center border-2 transition ${
                    active ? 'border-text' : 'border-transparent hover:border-line-2'
                  }`}
                  aria-label={c}
                >
                  <span
                    className="flex h-5 w-5 items-center justify-center"
                    style={{ background: c }}
                  >
                    {active && <Check size={12} className="text-white" />}
                  </span>
                </button>
              )
            })}
            <label className="relative flex h-7 w-7 cursor-pointer items-center justify-center border-2 border-dashed border-line-2 hover:border-muted">
              <span className="h-5 w-5" style={{ background: color }} />
              <input
                type="color"
                value={color}
                onChange={(e) => pick(e.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
          </div>
        </Field>
      </Group>

      <Group title={t('group_window')}>
        <Field label={t('window_size')} desc={t('window_size_desc')}>
          <Select
            value={settings.windowSize}
            minWidth={210}
            onChange={(v) => patch({ windowSize: v as WindowSizeKey })}
            options={sizeOptions}
          />
        </Field>
      </Group>

      <Group title={t('group_a11y')}>
        <Field label={t('ui_scale')} desc={t('ui_scale_desc')}>
          <Segmented<string>
            value={String(settings.uiScale)}
            options={UI_SCALES.map((scale) => ({
              value: String(scale),
              label: t('pct').replace('{n}', String(scale))
            }))}
            onChange={(v) => patch({ uiScale: Number(v) as UiScale })}
          />
        </Field>
        <Field label={t('bold_text')} desc={t('bold_text_desc')}>
          <Switch checked={settings.boldText} onChange={(v) => patch({ boldText: v })} />
        </Field>
        <Field label={t('high_contrast')} desc={t('high_contrast_desc')}>
          <Switch checked={settings.highContrast} onChange={(v) => patch({ highContrast: v })} />
        </Field>
        <Field label={t('reduce_motion')} desc={t('reduce_motion_desc')}>
          <Switch checked={settings.reduceMotion} onChange={(v) => patch({ reduceMotion: v })} />
        </Field>
      </Group>
    </div>
  )
}

function TextInput({
  value,
  onChange,
  width = 180,
  maxLength,
  invalid = false
}: {
  value: string
  onChange: (v: string) => void
  width?: number
  maxLength?: number
  invalid?: boolean
}): JSX.Element {
  const [localVal, setLocalVal] = useState(value)

  useEffect(() => {
    setLocalVal(value)
  }, [value])

  return (
    <input
      type="text"
      value={localVal}
      maxLength={maxLength}
      spellCheck={false}
      onChange={(e) => setLocalVal(e.target.value)}
      onBlur={() => {
        if (localVal !== value) onChange(localVal)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
      style={{ width }}
      className={`input ${invalid ? 'border-accent' : ''}`}
    />
  )
}

const IMG_LABEL: Record<string, string> = {
  auto: 'opt_auto',
  map: 'opt_map',
  agent: 'opt_agent',
  rank: 'opt_rank',
  playercard: 'opt_playercard',
  mode: 'opt_mode',
  none: 'opt_none'
}
const TXT_LABEL: Record<string, string> = {
  auto: 'opt_auto',
  playerName: 'opt_player_name',
  level: 'opt_level',
  mode: 'opt_mode_name',
  mapName: 'opt_map_name',
  agentName: 'opt_agent_name',
  score: 'opt_score',
  rank: 'opt_rank'
}
