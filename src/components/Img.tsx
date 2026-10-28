import { useState } from 'react'
import sizes from '@/data/image-sizes.json'
import { cn } from '@/lib/utils'

const known = sizes as Record<string, { width: number; height: number }>
const base = import.meta.env.BASE_URL

export const imgUrl = (key: string, width: 640 | 1280 = 1280) =>
  key.startsWith('data:') ? key : `${base}img/${key}-${width}.webp`

interface ImgProps {
  src: string
  alt: string
  className?: string
  /** contain shows the whole piece; cover is only for photos that can be cropped. */
  fit?: 'cover' | 'contain'
  /** CSS object-position, for per-image focal points. */
  focus?: string
  priority?: boolean
  sizesAttr?: string
}

export function Img({ src, alt, className, fit = 'cover', focus, priority, sizesAttr = '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw' }: ImgProps) {
  const [failed, setFailed] = useState(false)
  const dim = known[src]
  if (!src || failed)
    return (
      <div role="img" aria-label={alt ? `${alt} (imagem indisponível)` : 'Imagem indisponível'} className={cn('grid place-items-center bg-paper-2 text-sm text-ink-2', className)}>
        <span aria-hidden>Imagem indisponível</span>
      </div>
    )
  const uploaded = src.startsWith('data:')
  return (
    <img
      src={imgUrl(src)}
      srcSet={uploaded ? undefined : `${imgUrl(src, 640)} 640w, ${imgUrl(src, 1280)} ${Math.min(1280, dim?.width ?? 1280)}w`}
      sizes={uploaded ? undefined : sizesAttr}
      width={dim?.width ?? 1200}
      height={dim?.height ?? 1200}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      onError={() => setFailed(true)}
      className={cn(fit === 'cover' ? 'object-cover' : 'object-contain', className)}
      style={focus ? { objectPosition: focus } : undefined}
    />
  )
}
