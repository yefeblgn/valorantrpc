import { useEffect, useState } from 'react'
import * as RTabs from '@radix-ui/react-tabs'
import { motion } from 'framer-motion'
import type {
  AgentOption,
  LargeImageMode,
  LargeTextMode,
  Language,
  SmallImageMode,
  SmallTextMode
} from '@shared/types'
import { useStore } from '../store'
import { useT } from '../lib/i18n'
import { Field } from '../components/ui/Field'
import { Switch } from '../components/ui/Switch'
import { Select, type Option } from '../components/ui/Select'
import { Slider } from '../components/ui/Slider'
import { Segmented } from '../components/ui/Segmented'
import { DiscordPreview } from '../components/DiscordPreview'
import { UpdatePanel } from '../components/UpdatePanel'
import { darken } from '../lib/format'

const ACCENTS = ['#ff4655', '#5a9cff', '#3ba55d', '#b66dff', '#ff8a3d', '#ffce47']

const TABS = ['general', 'presence', 'autolock', 'appearance', 'updates'] as const
type Tab = (typeof TABS)[number]

export function Settings(): JSX.Element {
  const t = useT()
  const [tab, setTab] = useState<Tab>('general')

  return (
    <div className="p-6">
      <RTabs.Root value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <RTabs.List className="glass mb-5 flex gap-1 rounded-2xl p-1">
          {TABS.map((tb) => (
            <RTabs.Trigger
              key={tb}
              value={tb}
              className="relative flex-1 rounded-xl px-3 py-1.5 text-[12.5px] font-medium text-muted outline-none transition-colors data-[state=active]:text-white"
            >
              {tab === tb && (
                <motion.span
                  layoutId="tab-active"
                  className="glass-accent absolute inset-0 rounded-xl"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative z-10">{t(`tab_${tb}`)}</span>
            </RTabs.Trigger>
          ))}
        </RTabs.List>

        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          {tab === 'general' && <GeneralTab />}
          {tab === 'presence' && <PresenceTab />}
          {tab === 'autolock' && <AutolockTab />}
          {tab === 'appearance' && <AppearanceTab />}
          {tab === 'updates' && <UpdatesTab />}
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

function Group({ children }: { children: React.ReactNode }): JSX.Element {
  return <div className="glass rounded-2xl py-1.5">{children}</div>
}


function GeneralTab(): JSX.Element {
  const t = useT()
  const { settings, patch } = useSettings()
  const [localInterval, setLocalInterval] = useState(settings.pollInterval)

  useEffect(() => {
    setLocalInterval(settings.pollInterval)
  }, [settings.pollInterval])

  return (
    <Group>
      <Field label={t('rpc_enabled')} desc={t('rpc_enabled_desc')}>
        <Switch checked={settings.rpcEnabled} onChange={(v) => patch({ rpcEnabled: v })} />
      </Field>
      <Field label={t('language')} desc={t('language_desc')}>
        <Segmented<Language>
          id="lang"
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
          <span className="w-8 text-right text-[12px] font-medium text-muted">
            {localInterval}s
          </span>
        </div>
      </Field>
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

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">
      <div className="flex flex-col gap-5">
        <Group>
          <Sub>{t('presence_display')}</Sub>
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

        <Group>
          <Sub>{t('presence_slots')}</Sub>
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
              options={txtOpt(['auto', 'agentName', 'score', 'rank', 'mode', 'playerName', 'level'])}
            />
          </Field>
        </Group>

        <Group>
          <Field label={t('show_button')}>
            <Switch checked={settings.showButton} onChange={(v) => patch({ showButton: v })} />
          </Field>
          {settings.showButton && (
            <>
              <Field label={t('button_label')}>
                <TextInput
                  value={settings.buttonLabel}
                  onChange={(v) => patch({ buttonLabel: v })}
                />
              </Field>
              <Field label={t('button_url')}>
                <TextInput
                  value={settings.buttonUrl}
                  onChange={(v) => patch({ buttonUrl: v })}
                  width={220}
                />
              </Field>
            </>
          )}
        </Group>
      </div>

      <div className="lg:sticky lg:top-0 lg:self-start">
        <DiscordPreview presence={snap?.presence ?? null} rpcEnabled={settings.rpcEnabled} />
      </div>
    </div>
  )
}


function AutolockTab(): JSX.Element {
  const t = useT()
  const { settings, patch } = useSettings()
  const [agents, setAgents] = useState<AgentOption[]>([])

  useEffect(() => {
    void window.api.getAgents().then(setAgents)
  }, [])

  return (
    <Group>
      <Field label={t('autolock_enabled')} desc={t('autolock_desc')}>
        <Switch
          checked={settings.autolockEnabled}
          onChange={(v) => patch({ autolockEnabled: v })}
        />
      </Field>
      <Field label={t('select_agent')}>
        <Select
          value={settings.autolockAgent}
          placeholder="—"
          minWidth={170}
          onChange={(v) => patch({ autolockAgent: v })}
          options={agents.map((a) => ({ value: a.uuid, label: a.name }))}
        />
      </Field>
    </Group>
  )
}


function AppearanceTab(): JSX.Element {
  const t = useT()
  const { settings, patch } = useSettings()
  const [color, setColor] = useState(settings.accentColor)

  useEffect(() => {
    setColor(settings.accentColor)
  }, [settings.accentColor])

  const handleColorChange = (newColor: string) => {
    setColor(newColor)
    const root = document.documentElement
    root.style.setProperty('--color-accent', newColor)
    root.style.setProperty('--accent', newColor)
    root.style.setProperty('--color-accent-hover', darken(newColor, 0.12))
    root.style.setProperty('--accent-hover', darken(newColor, 0.12))
  }

  const handleColorCommit = (finalColor: string) => {
    patch({ accentColor: finalColor })
  }

  return (
    <Group>
      <Field label={t('accent_color')} desc={t('accent_color_desc')}>
        <div className="flex items-center gap-2">
          {ACCENTS.map((c) => (
            <button
              key={c}
              onClick={() => patch({ accentColor: c })}
              className={`h-6 w-6 rounded-full ring-2 transition ${
                color.toLowerCase() === c.toLowerCase()
                  ? 'ring-white'
                  : 'ring-transparent hover:ring-line'
              }`}
              style={{ background: c }}
              aria-label={c}
            />
          ))}
          <label className="relative h-6 w-6 cursor-pointer overflow-hidden rounded-full ring-2 ring-line">
            <span
              className="block h-full w-full"
              style={{ background: color }}
            />
            <input
              type="color"
              value={color}
              onInput={(e) => handleColorChange((e.target as HTMLInputElement).value)}
              onChange={(e) => handleColorCommit((e.target as HTMLInputElement).value)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        </div>
      </Field>
    </Group>
  )
}


function UpdatesTab(): JSX.Element {
  return <UpdatePanel />
}


function Sub({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div className="px-4 pb-1 pt-3.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-dim">
      {children}
    </div>
  )
}

function TextInput({
  value,
  onChange,
  width = 180
}: {
  value: string
  onChange: (v: string) => void
  width?: number
}): JSX.Element {
  const [localVal, setLocalVal] = useState(value)

  useEffect(() => {
    setLocalVal(value)
  }, [value])

  return (
    <input
      type="text"
      value={localVal}
      onChange={(e) => setLocalVal(e.target.value)}
      onBlur={() => {
        if (localVal !== value) onChange(localVal)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur()
        }
      }}
      style={{ width }}
      className="glass-subtle rounded-lg px-3 py-1.5 text-[12.5px] text-text outline-none transition focus:border-accent"
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
