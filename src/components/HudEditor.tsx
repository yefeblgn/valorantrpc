import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DEFAULT_HUD_LAYOUT,
  HUD_OPACITY_RANGE,
  HUD_SCALE_RANGE,
  type HudLayout
} from '@shared/types'
import { useStore } from '../store'
import { useT } from '../lib/i18n'
import { useHistory } from '../lib/history'
import { AgentSelectHud } from '../overlay/AgentSelectHud'
import { sampleReport } from '../overlay/sample'
import { Field } from './ui/Field'
import { Slider } from './ui/Slider'
import { Switch } from './ui/Switch'
import { Segmented } from './ui/Segmented'

const STAGE_W = 1920
const STAGE_H = 1080

const PRESETS: Record<string, Pick<HudLayout, 'x' | 'y'>> = {
  right: { x: 0.975, y: 0.33 },
  topRight: { x: 0.975, y: 0.04 },
  left: { x: 0.025, y: 0.55 },
  topLeft: { x: 0.025, y: 0.04 }
}

export function HudEditor(): JSX.Element {
  const t = useT()
  const settings = useStore((s) => s.settings)!
  const patch = useStore((s) => s.patch)
  const { catalog } = useHistory()
  const frame = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(560)
  const [draft, setDraft] = useState(settings.hudLayout)

  useEffect(() => setDraft(settings.hudLayout), [settings.hudLayout])

  useEffect(() => {
    const el = frame.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const report = useMemo(
    () =>
      sampleReport(catalog, {
        you: t('you'),
        mapName: t('map'),
        modeName: catalog?.modes.competitive?.name ?? t('sample_mode')
      }),
    [catalog, t]
  )
  const scale = width / STAGE_W
  const save = (next: Partial<HudLayout>): void => void patch({ hudLayout: { ...draft, ...next } })
  const preset =
    Object.entries(PRESETS).find(([, p]) => p.x === draft.x && p.y === draft.y)?.[0] ?? ''

  return (
    <div className="flex flex-col">
      <div className="px-4 pb-1 pt-3.5">
        <div className="text-[14px] font-medium">{t('hud_layout')}</div>
        <div className="mt-1 text-[12.5px] leading-snug text-dim">{t('hud_layout_desc')}</div>
      </div>
      <div className="px-4 py-3">
        <div
          ref={frame}
          className="relative w-full overflow-hidden border border-line-2 bg-[linear-gradient(135deg,#1a2230,#0b0e13_60%)]"
          style={{ height: width * (STAGE_H / STAGE_W) }}
        >
          {report.mapSplash && (
            <img
              src={report.mapSplash}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-35"
            />
          )}
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})` }}
          >
            <AgentSelectHud
              report={report}
              hotkey={settings.overlayHotkey}
              layout={draft}
              compact={settings.hudCompact}
              stage={{ width: STAGE_W, height: STAGE_H, pointerScale: scale }}
              onLayout={(x, y) => save({ x, y })}
              onCompact={(v) => void patch({ hudCompact: v })}
            />
          </div>
          <span className="pointer-events-none absolute bottom-2 start-2 bg-black/60 px-2 py-0.5 text-[11px] text-muted">
            {t('hud_preview_hint')}
          </span>
        </div>
      </div>
      <div className="divide-y divide-line border-t border-line">
        <Field label={t('hud_position')}>
          <Segmented<string>
            value={preset}
            options={Object.keys(PRESETS).map((key) => ({
              value: key,
              label: t(`hud_pos_${key}`)
            }))}
            onChange={(key) => save(PRESETS[key])}
          />
        </Field>
        <Field label={t('hud_size')}>
          <div className="flex items-center gap-3">
            <Slider
              value={draft.scale}
              min={HUD_SCALE_RANGE[0]}
              max={HUD_SCALE_RANGE[1]}
              step={0.05}
              onChange={(v) => setDraft({ ...draft, scale: v })}
              onCommit={(v) => save({ scale: v })}
            />
            <span className="display w-11 text-end text-[15px] text-muted">
              {t('pct').replace('{n}', String(Math.round(draft.scale * 100)))}
            </span>
          </div>
        </Field>
        <Field label={t('hud_opacity')} desc={t('hud_opacity_desc')}>
          <div className="flex items-center gap-3">
            <Slider
              value={draft.opacity}
              min={HUD_OPACITY_RANGE[0]}
              max={HUD_OPACITY_RANGE[1]}
              step={0.05}
              onChange={(v) => setDraft({ ...draft, opacity: v })}
              onCommit={(v) => save({ opacity: v })}
            />
            <span className="display w-11 text-end text-[15px] text-muted">
              {t('pct').replace('{n}', String(Math.round(draft.opacity * 100)))}
            </span>
          </div>
        </Field>
        <Field label={t('hud_compact_mode')} desc={t('hud_compact_mode_desc')}>
          <Switch checked={settings.hudCompact} onChange={(v) => void patch({ hudCompact: v })} />
        </Field>
        <Field label={t('hud_reset')}>
          <button
            onClick={() => void patch({ hudLayout: DEFAULT_HUD_LAYOUT, hudCompact: false })}
            className="btn btn-ghost"
          >
            {t('reset_default')}
          </button>
        </Field>
      </div>
    </div>
  )
}
