import { Menu, Tray, nativeImage } from 'electron'
import type { Language, Settings } from '@shared/types'
import { APP_NAME, assetPath } from './constants'
import { t } from '@shared/i18n'

export interface TrayDeps {
  showWindow: () => void
  getSettings: () => Settings
  applyPatch: (p: Partial<Settings>) => void
  quit: () => void
}

export class AppTray {
  private tray: Tray
  private active = false

  constructor(private deps: TrayDeps) {
    this.tray = new Tray(this.icon(false))
    this.tray.setToolTip(APP_NAME)
    this.tray.on('click', () => this.deps.showWindow())
    this.tray.on('double-click', () => this.deps.showWindow())
    this.rebuildMenu()
  }

  private icon(active: boolean): Electron.NativeImage {
    const img = nativeImage.createFromPath(
      assetPath(active ? 'game_icon.png' : 'game_icon_idle.png')
    )
    return img.isEmpty() ? nativeImage.createEmpty() : img
  }

  private lang(): Language {
    return this.deps.getSettings().language
  }

  rebuildMenu(): void {
    const s = this.deps.getSettings()
    const lang = s.language
    const menu = Menu.buildFromTemplate([
      {
        label: t(lang, 'tray_show'),
        click: () => this.deps.showWindow()
      },
      { type: 'separator' },
      {
        label: t(lang, 'rpc_enabled'),
        type: 'checkbox',
        checked: s.rpcEnabled,
        click: () => this.deps.applyPatch({ rpcEnabled: !s.rpcEnabled })
      },
      {
        label: t(lang, 'language'),
        submenu: [
          {
            label: 'Türkçe',
            type: 'radio',
            checked: lang === 'tr',
            click: () => this.deps.applyPatch({ language: 'tr', languageDetected: true })
          },
          {
            label: 'English',
            type: 'radio',
            checked: lang === 'en',
            click: () => this.deps.applyPatch({ language: 'en', languageDetected: true })
          }
        ]
      },
      {
        label: t(lang, 'autostart'),
        type: 'checkbox',
        checked: s.autostart,
        click: () => this.deps.applyPatch({ autostart: !s.autostart })
      },
      { type: 'separator' },
      {
        label: t(lang, 'tray_quit'),
        click: () => this.deps.quit()
      }
    ])
    this.tray.setContextMenu(menu)
  }

  update(active: boolean, statusText: string): void {
    if (active !== this.active) {
      this.active = active
      this.tray.setImage(this.icon(active))
    }
    this.tray.setToolTip(`${APP_NAME} · ${statusText}`)
  }

  notify(message: string, title?: string): void {
    try {
      this.tray.displayBalloon({ title: title ?? APP_NAME, content: message })
    } catch {
      
    }
  }

  destroy(): void {
    this.tray.destroy()
  }
}
