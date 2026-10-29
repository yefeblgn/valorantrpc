import { nativeTheme, screen, type BrowserWindow } from 'electron'
import { WINDOW_SIZES, type Settings, type WindowInfo, type WindowSizeKey } from '@shared/types'

type Preset = Exclude<WindowSizeKey, 'auto'>

const LARGEST_FIRST: Preset[] = ['xlarge', 'large', 'medium', 'small']
const SCREEN_MARGIN = 48
const AUTO_WIDTH_SHARE = 0.7
const BACKGROUND = { dark: '#0b0e13', light: '#ecebe7' }

function workArea(win?: BrowserWindow | null): Electron.Size {
  const display =
    win && !win.isDestroyed()
      ? screen.getDisplayMatching(win.getBounds())
      : screen.getPrimaryDisplay()
  return display.workAreaSize
}

export function windowInfo(win?: BrowserWindow | null): WindowInfo {
  const area = workArea(win)
  const fits = LARGEST_FIRST.filter(
    (key) =>
      WINDOW_SIZES[key][0] <= area.width - SCREEN_MARGIN &&
      WINDOW_SIZES[key][1] <= area.height - SCREEN_MARGIN
  )
  const auto =
    fits.find((key) => WINDOW_SIZES[key][0] <= area.width * AUTO_WIDTH_SHARE) ??
    fits[fits.length - 1] ??
    'small'
  return { auto, fits: [...fits].reverse() }
}

export function resolveSize(pref: WindowSizeKey, win?: BrowserWindow | null): [number, number] {
  const info = windowInfo(win)
  const key = pref !== 'auto' && info.fits.includes(pref) ? pref : info.auto
  const area = workArea(win)
  const [width, height] = WINDOW_SIZES[key]
  return [Math.min(width, area.width), Math.min(height, area.height)]
}

export function applySize(win: BrowserWindow, pref: WindowSizeKey): void {
  const [width, height] = resolveSize(pref, win)
  const resizable = win.isResizable()
  win.setResizable(true)
  win.setContentSize(width, height)
  win.setResizable(resizable)
  win.center()
}

export function themeBackground(settings: Settings): string {
  const dark =
    settings.theme === 'system' ? nativeTheme.shouldUseDarkColors : settings.theme === 'dark'
  return dark ? BACKGROUND.dark : BACKGROUND.light
}
