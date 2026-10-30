import { createHash } from 'crypto'
import { readFileSync, statSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const release = join(root, 'release')
const name = `ValorantRPC-${version}-portable.exe`
const manifest = join(release, 'latest.yml')

const exe = readFileSync(join(release, name))
const sha512 = createHash('sha512').update(exe).digest('base64')
const size = statSync(join(release, name)).size

const lines = readFileSync(manifest, 'utf8').split(/\r?\n/)
if (lines[0] !== `version: ${version}`) {
  throw new Error(`latest.yml is for "${lines[0]}", expected version ${version}`)
}

const kept = []
for (let i = 0; i < lines.length; i++) {
  if (/^  - url: .*-portable\.exe$/.test(lines[i])) {
    while (lines[i + 1]?.startsWith('    ')) i++
    continue
  }
  kept.push(lines[i])
}

const at = kept.findIndex((l) => l.startsWith('path:'))
if (at < 0) throw new Error('latest.yml has no path entry')
kept.splice(at, 0, `  - url: ${name}`, `    sha512: ${sha512}`, `    size: ${size}`)

writeFileSync(manifest, kept.join('\n'))
console.log(`latest.yml: added ${name} (${size} bytes)`)
