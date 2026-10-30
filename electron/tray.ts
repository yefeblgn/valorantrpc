import { Menu, Notification, Tray, nativeImage } from 'electron'
import { LANGUAGES, LANGUAGE_NAMES, type Language, type Settings } from '@shared/types'
import { APP_TITLE, assetPath } from './constants'
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
  private lastNotice: Notification | null = null

  constructor(private deps: TrayDeps) {
    this.tray = new Tray(this.icon(false))
    this.tray.setToolTip(APP_TITLE)
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
        label: t(lang, 'streamer_mode'),
        type: 'checkbox',
        checked: s.streamerMode,
        click: () => this.deps.applyPatch({ streamerMode: !s.streamerMode })
      },
      {
        label: t(lang, 'language'),
        submenu: LANGUAGES.map((code) => ({
          label: LANGUAGE_NAMES[code],
          type: 'radio' as const,
          checked: lang === code,
          click: () => this.deps.applyPatch({ language: code, languageDetected: true })
        }))
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
    this.tray.setToolTip(`${APP_TITLE} · ${statusText}`)
  }

  notify(message: string, title?: string, onClick?: () => void): void {
    try {
      if (!Notification.isSupported()) {
        this.tray.displayBalloon({ title: title ?? APP_TITLE, content: message })
        return
      }
      const notice = new Notification({
        title: title ?? APP_TITLE,
        body: message,
        icon: assetPath('game_icon.png')
      })
      notice.on('click', () => (onClick ? onClick() : this.deps.showWindow()))
      notice.show()
      this.lastNotice = notice
    } catch (e) {
      console.debug('[tray] notify failed:', e)
    }
  }

  destroy(): void {
    this.tray.destroy()
  }
}
