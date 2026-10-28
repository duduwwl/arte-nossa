import { AlertTriangle, Info } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { type ReactNode, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { DEMO_NOTICE } from '@/data/store'
import type { Product } from '@/data/types'
import { formatCents, isLowStock, totalStock } from '@/lib/shop'
import { cn, useReducedMotion } from '@/lib/utils'
import { InView } from './vendor/in-view'
import { Img } from './Img'

/** Section entrance built on Motion Primitives InView; content is fully visible without motion. */
export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduced = useReducedMotion()
  if (reduced) return <div className={className}>{children}</div>
  return (
    <InView
      variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
      viewOptions={{ once: true, margin: '0px 0px -60px 0px' }}
      once
    >
      <div className={className}>{children}</div>
    </InView>
  )
}

export function DemoNotice({ className }: { className?: string }) {
  return (
    <p role="note" className={cn('flex items-start gap-2 rounded-md border border-accent/60 bg-accent-soft px-4 py-3 text-sm font-medium text-ink', className)}>
      <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
      {DEMO_NOTICE}
    </p>
  )
}

export function Alert({ children, tone = 'danger', className }: { children: ReactNode; tone?: 'danger' | 'ok' | 'info'; className?: string }) {
  const tones = { danger: 'border-danger/40 bg-danger-soft', ok: 'border-ok/40 bg-ok-soft', info: 'border-teal/30 bg-teal-soft' }
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('flex items-start gap-2 rounded-md border px-4 py-3 text-sm text-ink', tones[tone], className)}>
      {tone === 'danger' ? <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-danger" /> : <Info aria-hidden className="mt-0.5 size-4 shrink-0" />}
      <div>{children}</div>
    </div>
  )
}

export function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) return <span className="badge bg-ink/10 text-ink-2">Esgotado</span>
  if (isLowStock(stock)) return <span className="badge bg-accent-soft text-ink">Últimas {stock} unid.</span>
  return <span className="badge bg-ok-soft text-ok">Disponível</span>
}

export function ProductCard({ product, priority }: { product: Product; priority?: boolean }) {
  const stock = totalStock(product)
  const reduced = useReducedMotion()
  return (
    <motion.article
      whileHover={reduced ? undefined : { y: -4 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-line bg-card transition-shadow hover:shadow-[0_18px_40px_-24px_rgba(31,27,22,.45)]"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-paper-2">
        <Img
          src={product.images[0]}
          alt={product.name}
          priority={priority}
          className="size-full transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.04]"
          sizesAttr="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 50vw"
        />
        <div className="absolute top-3 left-3">
          <StockBadge stock={stock} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="font-sans text-base leading-snug font-semibold">
          <Link to={`/produto/${product.id}`} className="after:absolute after:inset-0 focus-visible:outline-none [&:focus-visible]:after:outline-3 [&:focus-visible]:after:outline-teal [&:focus-visible]:after:rounded-lg">
            {product.name}
          </Link>
        </h3>
        {product.variants.length > 1 && <p className="text-sm text-ink-2">{product.variants.length} opções</p>}
        <p className="mt-auto pt-2 text-base font-semibold tabular-nums">
          {formatCents(product.priceCents)}
          <span className="block text-xs font-medium text-ink-2">valor fictício</span>
        </p>
      </div>
    </motion.article>
  )
}

// --- toasts ---
type Toast = { id: number; text: string }
let toasts: Toast[] = []
const toastListeners = new Set<() => void>()
export function toast(text: string) {
  const id = Date.now() + Math.random()
  toasts = [...toasts, { id, text }]
  toastListeners.forEach((l) => l())
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id)
    toastListeners.forEach((l) => l())
  }, 3800)
}
export function Toaster() {
  const list = useSyncExternalStore(
    (fn) => {
      toastListeners.add(fn)
      return () => toastListeners.delete(fn)
    },
    () => toasts,
  )
  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {list.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="pointer-events-auto max-w-md rounded-md bg-ink px-4 py-3 text-sm font-medium text-paper shadow-xl"
          >
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="border-b border-line bg-paper-2/60">
      <div className="container-page py-10 sm:py-14">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="text-4xl sm:text-5xl">{title}</h1>
        {children && <div className="mt-4 max-w-2xl text-ink-2">{children}</div>}
      </div>
    </header>
  )
}
