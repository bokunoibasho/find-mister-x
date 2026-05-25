/**
 * Generates the PWA/app icons from an inline SVG (magnifying glass + hidden X).
 * Run: npm run gen:icons
 */
import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pub = resolve(__dirname, '../public')
mkdirSync(pub, { recursive: true })

const BG = '#0f1226'

const artwork = `
  <g fill="none" stroke-linecap="round">
    <line x1="300" y1="300" x2="408" y2="408" stroke="#f59e0b" stroke-width="44" />
    <circle cx="218" cy="218" r="122" fill="rgba(245,158,11,0.12)" stroke="#f59e0b" stroke-width="30" />
    <line x1="176" y1="176" x2="260" y2="260" stroke="#ef4444" stroke-width="32" />
    <line x1="260" y1="176" x2="176" y2="260" stroke="#ef4444" stroke-width="32" />
  </g>`

function svg(size: number, maskable: boolean): string {
  const inner = maskable
    ? `<g transform="translate(256,256) scale(0.72) translate(-256,-256)">${artwork}</g>`
    : artwork
  const radius = maskable ? 0 : 96
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
    <rect width="512" height="512" rx="${radius}" fill="${BG}" />
    ${inner}
  </svg>`
}

async function png(size: number, maskable: boolean, file: string) {
  await sharp(Buffer.from(svg(size, maskable))).png().toFile(resolve(pub, file))
  console.log(`wrote ${file}`)
}

async function main() {
  writeFileSync(resolve(pub, 'favicon.svg'), svg(512, false))
  console.log('wrote favicon.svg')
  await png(192, false, 'pwa-192.png')
  await png(512, false, 'pwa-512.png')
  await png(512, true, 'pwa-512-maskable.png')
  await png(180, false, 'apple-touch-icon.png')
}

main()
