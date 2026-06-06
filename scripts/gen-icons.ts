/**
 * Генерация PWA-иконок из public/icon.svg.
 * Запуск: npm run gen:icons
 */
import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const svg = readFileSync(resolve(root, 'public/icon.svg'))

const targets = [
  { file: 'pwa-192x192.png', size: 192 },
  { file: 'pwa-512x512.png', size: 512 },
  { file: 'maskable-512x512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 }, // iOS home screen
  { file: 'favicon-32x32.png', size: 32 },
]

for (const t of targets) {
  await sharp(svg, { density: 384 })
    .resize(t.size, t.size)
    .png()
    .toFile(resolve(root, 'public', t.file))
  console.log(`✓ public/${t.file} (${t.size}×${t.size})`)
}
console.log('Готово.')
