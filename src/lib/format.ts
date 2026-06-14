
export function darken(hex: string, amount = 0.12): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return hex
  const n = parseInt(m[1], 16)
  const r = Math.max(0, Math.round(((n >> 16) & 0xff) * (1 - amount)))
  const g = Math.max(0, Math.round(((n >> 8) & 0xff) * (1 - amount)))
  const b = Math.max(0, Math.round((n & 0xff) * (1 - amount)))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}


export function isUrl(s: string | undefined | null): boolean {
  return !!s && /^https?:\/\//.test(s)
}


export function discordAvatarUrl(
  user: { id: string; avatar: string | null } | null | undefined
): string | null {
  if (!user) return null
  if (!user.avatar) {
    const idx = (BigInt(user.id) >> 22n) % 6n
    return `https://cdn.discordapp.com/embed/avatars/${idx}.png`
  }
  const ext = user.avatar.startsWith('a_') ? 'webp' : 'png'
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=64`
}


export function elapsed(startSec: number): string {
  const total = Math.max(0, Math.floor(Date.now() / 1000) - startSec)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (x: number): string => String(x).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}
