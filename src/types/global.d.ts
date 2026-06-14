import type { AppApi } from '../../electron/preload'

declare global {
  interface Window {
    api: AppApi
  }
}

export {}
