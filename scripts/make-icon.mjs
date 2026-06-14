// buildResources/icon.ico üretir (1024px kaynak PNG'den, çok boyutlu ICO).
import pngToIco from 'png-to-ico'
import { mkdirSync, writeFileSync } from 'fs'

mkdirSync('buildResources', { recursive: true })
const buf = await pngToIco('assets/game_icon.png')
writeFileSync('buildResources/icon.ico', buf)
console.log('icon.ico written:', buf.length, 'bytes')
