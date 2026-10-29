import { AlertTriangle, Info, ShoppingBag } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { type ReactNode, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { DEMO_NOTICE } from '@/data/store'
import type { Product } from '@/data/types'
import { formatCents, isLowStock, totalStock } from '@/lib/shop'
import { cn, useReducedMotion, useShop } from '@/lib/utils'
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
      viewOptions={{ once: true, amount: 0.1 }}
      once
    >
      <div className={className}>{children}</div>
    </InView>
  )
}

export function DemoNotice({ className }: { className?: string }) {
  return (
    <p role="note" className={cn('flex items-start gap-2 rounded-md bg-accent-soft px-4 py-3 text-base text-ink', className)}>
      <Info aria-hidden className="mt-1 size-4 shrink-0 text-accent" />
      {DEMO_NOTICE}
    </p>
  )
}

export function Alert({ children, tone = 'danger', className }: { children: ReactNode; tone?: 'danger' | 'ok' | 'info'; className?: string }) {
  const tones = { danger: 'bg-danger-soft', ok: 'bg-ok-soft', info: 'bg-card' }
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('flex items-start gap-2 rounded-md px-4 py-3 text-base text-ink', tones[tone], className)}>
      {tone === 'danger' ? <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-danger" /> : <Info aria-hidden className="mt-1 size-4 shrink-0 text-accent" />}
      <div>{children}</div>
    </div>
  )
}

export function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) return <span className="badge bg-paper text-ink">Esgotado</span>
  if (isLowStock(stock)) return <span className="badge bg-accent text-paper">Últimas {stock} unid.</span>
  return <span className="badge bg-paper text-ok">Disponível</span>
}

export function ProductCard({ product, priority }: { product: Product; priority?: boolean }) {
  const stock = totalStock(product)
  const reduced = useReducedMotion()
  return (
    <motion.article
      whileHover={reduced ? undefined : { y: -4 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="group relative flex h-full flex-col overflow-hidden rounded-lg bg-paper-2 transition-colors hover:bg-card"
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
        <h3 className="font-sans text-lg leading-snug font-semibold normal-case">
          <Link to={`/produto/${product.id}`} className="after:absolute after:inset-0 focus-visible:outline-none [&:focus-visible]:after:outline-3 [&:focus-visible]:after:outline-accent [&:focus-visible]:after:rounded-lg">
            {product.name}
          </Link>
        </h3>
        {product.variants.length > 1 && <p className="text-base text-ink-2">{product.variants.length} opções</p>}
        <p className="mt-auto pt-2 text-lg font-semibold tabular-nums">
          {formatCents(product.priceCents)}
          <span className="block text-sm font-normal text-ink-2">valor fictício</span>
        </p>
      </div>
    </motion.article>
  )
}

// --- toasts ---
type Toast = { id: number; text: string; action?: { label: string; run: () => void } }
let toasts: Toast[] = []
const toastListeners = new Set<() => void>()
export function toast(text: string, action?: Toast['action']) {
  const id = Date.now() + Math.random()
  toasts = [...toasts, { id, text, action }]
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
            className="pointer-events-auto max-w-md rounded-md bg-accent px-4 py-3 text-base font-semibold text-paper"
          >
            {t.text}
            {t.action && (
              <button
                type="button"
                className="ml-3 min-h-11 rounded-full px-2 font-semibold underline underline-offset-4"
                onClick={() => (t.action!.run(), (toasts = toasts.filter((x) => x.id !== t.id)), toastListeners.forEach((l) => l()))}
              >
                {t.action.label}
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export function PageHeader({ title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="stagger container-page grid gap-6 pt-10 pb-8 sm:pt-16 lg:grid-cols-[1fr_minmax(0,28rem)] lg:items-end">
      <h1 className="text-[clamp(3.5rem,11vw,10rem)]">{title}</h1>
      {children && <div className="text-lg text-ink lg:pb-3">{children}</div>}
    </header>
  )
}

/** Empty bag: points back to the shop window instead of leaving an empty screen. */
export function EmptyBag() {
  const { data } = useShop()
  return (
    <div className="stagger">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-paper-2 p-6">
          <p className="flex items-center gap-3 text-lg">
            <ShoppingBag aria-hidden className="size-6 text-accent" /> Sua sacola está vazia. Comece pelas peças da vitrine.
          </p>
          <Link to="/produtos" className="btn-primary">
            Ver todos os produtos
          </Link>
        </div>
        <h2 className="mt-16 mb-8 text-[clamp(2.5rem,5vw,4.5rem)]">Da vitrine</h2>
        <ul className="stagger grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {data.products
            .filter((p) => p.featured && p.variants.some((v) => v.stock > 0))
            .slice(0, 8)
            .map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
        </ul>
      </div>
  )
}
