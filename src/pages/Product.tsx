import { ChevronLeft, ChevronRight, Expand, MessageCircle, ShoppingBag } from 'lucide-react'
import { Instagram } from '@/components/Icons'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Dialog } from '@/components/Dialog'
import { Img } from '@/components/Img'
import { usePageTitle } from '@/components/Layout'
import { Alert, DemoNotice, ProductCard, StockBadge, toast } from '@/components/ui'
import { PopStepper } from '@/components/vendor/pop-stepper'
import { categoryName } from '@/data/products'
import { whatsappLink } from '@/data/store'
import type { Product as P } from '@/data/types'
import { setBag } from '@/lib/db'
import { addToBag, formatCents, totalStock } from '@/lib/shop'
import { cn, formatDate, useReducedMotion, useShop } from '@/lib/utils'

function Gallery({ product, index, setIndex }: { product: P; index: number; setIndex: (i: number) => void }) {
  const [zoom, setZoom] = useState(false)
  const reduced = useReducedMotion()
  const images = product.images.length ? product.images : ['']
  const i = Math.min(index, images.length - 1)
  const go = (d: number) => setIndex((i + d + images.length) % images.length)

  return (
    <div>
      <div className="relative overflow-hidden rounded-lg bg-paper-2">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={i} initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reduced ? undefined : { opacity: 0 }} transition={{ duration: 0.2 }}>
            <Img src={images[i]} alt={`${product.name}, foto ${i + 1} de ${images.length}`} fit="contain" priority className="aspect-square w-full" sizesAttr="(min-width: 1024px) 50vw, 100vw" />
          </motion.div>
        </AnimatePresence>
        {images[i] && (
          <button type="button" onClick={() => setZoom(true)} className="btn-outline absolute right-3 bottom-3 bg-card/90 px-3" aria-label="Ampliar foto">
            <Expand aria-hidden className="size-4" /> <span className="hidden sm:inline">Ampliar</span>
          </button>
        )}
        {images.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} className="btn-outline absolute top-1/2 left-3 size-11 -translate-y-1/2 bg-card/90 p-0" aria-label="Foto anterior">
              <ChevronLeft aria-hidden className="size-5" />
            </button>
            <button type="button" onClick={() => go(1)} className="btn-outline absolute top-1/2 right-3 size-11 -translate-y-1/2 bg-card/90 p-0" aria-label="Próxima foto">
              <ChevronRight aria-hidden className="size-5" />
            </button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <ul className="mt-3 flex gap-2" aria-label="Miniaturas">
          {images.map((src, n) => (
            <li key={src + n}>
              <button
                type="button"
                onClick={() => setIndex(n)}
                aria-label={`Ver foto ${n + 1}`}
                aria-current={n === i}
                className={cn('block size-18 overflow-hidden rounded-md outline-offset-2', n === i ? 'outline-3 outline-accent' : 'opacity-70 hover:opacity-100')}
              >
                <Img src={src} alt="" className="size-full" sizesAttr="80px" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={zoom} onClose={() => setZoom(false)} title={`${product.name} — foto ${i + 1} de ${images.length}`} className="w-[min(100vw-1rem,72rem)]">
        <div
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') go(1)
            if (e.key === 'ArrowLeft') go(-1)
          }}
        >
          <Img src={images[i]} alt={`${product.name}, foto ${i + 1} ampliada`} fit="contain" className="max-h-[72dvh] w-full" sizesAttr="100vw" />
          {images.length > 1 && (
            <div className="mt-4 flex justify-center gap-3">
              <button type="button" className="btn-outline" onClick={() => go(-1)}>
                <ChevronLeft aria-hidden className="size-4" /> Anterior
              </button>
              <button type="button" className="btn-outline" onClick={() => go(1)}>
                Próxima <ChevronRight aria-hidden className="size-4" />
              </button>
            </div>
          )}
        </div>
      </Dialog>
    </div>
  )
}

export function Product() {
  const { id } = useParams()
  const { data, bag } = useShop()
  const product = data.products.find((p) => p.id === id)
  usePageTitle(product?.name ?? 'Produto não encontrado')
  const firstAvailable = product?.variants.find((v) => v.stock > 0)?.id ?? product?.variants[0]?.id ?? ''
  const [variantId, setVariantId] = useState(firstAvailable)
  const [photo, setPhoto] = useState(() => Math.max(0, product?.images.indexOf(product.variants.find((v) => v.id === firstAvailable)?.image ?? '') ?? 0))
  const [qty, setQty] = useState(1)
  const [error, setError] = useState('')

  if (!product)
    return (
      <div className="container-page py-24 text-center">
        <h1 className="text-4xl">Produto não encontrado</h1>
        <p className="mt-3 text-ink-2">Ele pode ter sido removido do catálogo de demonstração.</p>
        <Link to="/produtos" className="btn-primary mt-8">
          Voltar ao catálogo
        </Link>
      </div>
    )

  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0]
  const inBag = bag.find((i) => i.productId === product.id && i.variantId === variant.id)?.qty ?? 0
  const canAdd = Math.max(0, variant.stock - inBag)
  const related = data.products.filter((p) => p.category === product.category && p.id !== product.id && totalStock(p) > 0).slice(0, 4)

  const add = () => {
    setError('')
    if (variant.stock === 0) return setError('Esta opção está esgotada.')
    if (qty > canAdd) return setError(canAdd === 0 ? 'Você já tem todo o estoque desta opção na sacola.' : `Só é possível adicionar mais ${canAdd} unidade(s).`)
    const res = addToBag(bag, product, variant.id, qty)
    setBag(res.bag)
    toast(`${res.added}× ${product.name} adicionado à sacola.`)
    setQty(1)
  }

  return (
    <div className="container-page py-8 sm:py-12">
      <nav aria-label="Trilha" className="mb-6 text-sm text-ink-2">
        <ol className="flex flex-wrap items-center gap-1">
          <li><Link to="/" className="hover:text-teal">Início</Link> /</li>
          <li><Link to="/produtos" className="hover:text-teal">Produtos</Link> /</li>
          <li><Link to={`/produtos?categoria=${product.category}`} className="hover:text-teal">{categoryName(product.category)}</Link> /</li>
          <li aria-current="page" className="font-semibold text-ink">{product.name}</li>
        </ol>
      </nav>

      <div className="grid gap-10 md:grid-cols-2 lg:gap-14">
        <div className="min-w-0 animate-[rise_.7s_var(--ease-out-soft)_both]">
          <Gallery product={product} index={photo} setIndex={setPhoto} />
        </div>
        <div className="stagger min-w-0">
          <h1 className="text-[clamp(3rem,5.5vw,5.5rem)]">{product.name}</h1>
          <p className="mt-3 text-lg">
            <Link to={`/produtos?categoria=${product.category}`} className="link">
              {categoryName(product.category)}
            </Link>
          </p>
          <p className="mt-6 text-3xl font-semibold text-accent tabular-nums">
            {formatCents(product.priceCents)}
            <span className="ml-2 align-middle text-sm font-medium text-ink-2">valor fictício de demonstração</span>
          </p>
          <p className="mt-5 text-lg">{product.description}</p>

          <fieldset className={cn('mt-8', product.variants.length === 1 && 'sr-only')}>
            <legend className="label">{product.variants.length > 1 ? 'Escolha a opção' : 'Opção'}</legend>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((v) => (
                <label
                  key={v.id}
                  className={cn(
                    'flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-base font-semibold transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-teal',
                    v.id === variant.id ? 'bg-accent text-paper' : 'bg-card hover:bg-ink hover:text-paper',
                    v.stock === 0 && 'opacity-60',
                  )}
                >
                  <input type="radio" name="variante" value={v.id} checked={v.id === variant.id} onChange={() => (setVariantId(v.id), setQty(1), setError(''), v.image && product.images.includes(v.image) && setPhoto(product.images.indexOf(v.image)))} className="sr-only" />
                  {v.label}
                  {v.stock === 0 && <span className="font-normal">(esgotado)</span>}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-4">
            <StockBadge stock={variant.stock} />
            {variant.stock > 0 && <span className="ml-2 text-sm text-ink-2">{variant.stock} em estoque (fictício){inBag > 0 && ` · ${inBag} na sua sacola`}</span>}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <PopStepper value={Math.min(qty, Math.max(1, canAdd))} onChange={setQty} max={Math.max(1, canAdd)} label="Quantidade" />
            <button type="button" className="btn-primary h-12 flex-1 px-6 text-base sm:flex-none" onClick={add} disabled={canAdd === 0}>
              <ShoppingBag aria-hidden className="size-5" /> {variant.stock === 0 ? 'Esgotado' : canAdd === 0 ? 'Limite na sacola' : 'Adicionar à sacola'}
            </button>
          </div>
          {error && <Alert className="mt-4">{error}</Alert>}

          <a
            href={whatsappLink(`Olá, Arte Nossa! Tenho interesse em: ${product.name}${product.variants.length > 1 ? ` (${variant.label})` : ''}. Pode me passar valor e disponibilidade?`)}
            target="_blank"
            rel="noreferrer"
            className="btn-outline mt-4 w-full sm:w-auto"
          >
            <MessageCircle aria-hidden className="size-4" /> Consultar valor real no WhatsApp
          </a>

          <DemoNotice className="mt-6" />

          <dl className="mt-8 space-y-1 rounded-lg bg-paper-2 p-5 text-base">
            <div className="grid grid-cols-[9rem_1fr] gap-4 py-3">
              <dt className="font-semibold">Materiais e medidas</dt>
              <dd className="text-ink-2">{product.details.length ? product.details.join(' · ') : 'Não informados pela loja. Consulte pelo WhatsApp.'}</dd>
            </div>
            <div className="grid grid-cols-[9rem_1fr] gap-4 py-3">
              <dt className="font-semibold">Cuidados</dt>
              <dd className="text-ink-2">Não informados pela loja. Consulte antes da compra.</dd>
            </div>
            {product.publishedPrice && (
              <div className="grid grid-cols-[9rem_1fr] gap-4 py-3">
                <dt className="font-semibold">Preço divulgado</dt>
                <dd className="text-ink-2">{product.publishedPrice}. Pode ter mudado; confirme com a loja.</dd>
              </div>
            )}
            {product.source && (
              <div className="grid grid-cols-[9rem_1fr] gap-4 py-3">
                <dt className="font-semibold">Fonte</dt>
                <dd>
                  <a href={product.source.url} target="_blank" rel="noreferrer" className="link inline-flex items-center gap-1">
                    <Instagram aria-hidden className="size-4" /> Publicação de {formatDate(product.source.date)}
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20" aria-labelledby="rel">
          <h2 id="rel" className="mb-6 text-3xl">
            Combina com
          </h2>
          <ul className="stagger grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {related.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
