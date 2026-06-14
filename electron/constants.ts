import { join } from 'path'
import { app } from 'electron'

export const DISCORD_CLIENT_ID = '1434340968487850135'
export const GITHUB_URL = 'https://github.com/yefeblgn/valorantrpc'
export const GITHUB_REPO = 'yefeblgn/valorantrpc'
export const GITHUB_RELEASES_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`
export const VALORANT_API = 'https://valorant-api.com/v1'
export const MEDIA = 'https://media.valorant-api.com'


export const CLIENT_PLATFORM =
  'ew0KCSJwbGF0Zm9ybVR5cGUiOiAiUEMiLA0KCSJwbGF0Zm9ybU9TIjogIldpbmRvd3Mi' +
  'LA0KCSJwbGF0Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwN' +
  'CgkicGxhdGZvcm1DaGlwc2V0IjogIlVua25vd24iDQp9'

export const FALLBACK_CLIENT_VERSION = 'release-09.00-shipping-9-0000000'
export const FALLBACK_LARGE_IMAGE = 'valorant_logo'
export const APP_NAME = 'ValorantRPC'
export const DEFAULT_POLL_INTERVAL = 2.0

const LOCALAPPDATA = process.env.LOCALAPPDATA || app.getPath('home')

export function appDataDir(): string {
  return app.getPath('userData')
}

export function cacheDir(): string {
  return join(app.getPath('userData'), 'cache')
}

export function configPath(): string {
  return join(app.getPath('userData'), 'config.json')
}

export function riotLockfilePath(): string {
  return join(LOCALAPPDATA, 'Riot Games', 'Riot Client', 'Config', 'lockfile')
}

export function valorantLogPath(): string {
  return join(LOCALAPPDATA, 'VALORANT', 'Saved', 'Logs', 'ShooterGame.log')
}


export function assetPath(...parts: string[]): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'assets', ...parts)
    : join(__dirname, '../../assets', ...parts)
}
