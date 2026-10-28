// Converts original photos (any format sharp reads) into responsive WebP files.
// Usage: node scripts/optimize-images.mjs <source-dir>
// Output: public/img/<name>-640.webp, public/img/<name>-1280.webp and src/data/image-sizes.json
import { mkdir, readdir, writeFile } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import sharp from 'sharp'

const src = process.argv[2]
if (!src) {
  console.error('Usage: node scripts/optimize-images.mjs <source-dir>')
  process.exit(1)
}

const out = 'public/img'
await mkdir(out, { recursive: true })
const sizes = {}

for (const file of await readdir(src)) {
  const name = basename(file, extname(file))
  const image = sharp(join(src, file), { failOn: 'none' }).rotate()
  const meta = await image.metadata()
  if (!meta.width || !meta.height) {
    console.warn(`skip ${file}: unreadable`)
    continue
  }
  // Never upscale: a small original stays small instead of inventing detail.
  for (const width of [640, 1280]) {
    await image
      .clone()
      .resize({ width: Math.min(width, meta.width), withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(join(out, `${name}-${width}.webp`))
  }
  sizes[name] = { width: meta.width, height: meta.height }
  console.log(`${name} ${meta.width}x${meta.height}`)
}

await writeFile('src/data/image-sizes.json', JSON.stringify(sizes, null, 2) + '\n')
