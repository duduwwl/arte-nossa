// Builds favicon.png (store logo, circular, never upscaled) and og.jpg (storefront photo).
// Usage: node scripts/make-icons.mjs <logo-image>
import sharp from 'sharp'

const logoSrc = process.argv[2]
if (!logoSrc) {
  console.error('Usage: node scripts/make-icons.mjs <logo-image>')
  process.exit(1)
}
const { width = 150 } = await sharp(logoSrc).metadata()
const size = Math.min(width, 192)
const mask = Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/></svg>`)
await sharp(logoSrc).resize(size, size, { fit: 'cover' }).composite([{ input: mask, blend: 'dest-in' }]).png().toFile('public/favicon.png')
await sharp('public/img/fachada-1-1280.webp').resize(1200, 630, { fit: 'cover', position: 'centre' }).jpeg({ quality: 82 }).toFile('public/og.jpg')
console.log(`favicon ${size}px, og 1200x630`)
