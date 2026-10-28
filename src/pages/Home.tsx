import { ArrowRight, Gift, MessageCircle, Sparkles, Truck, Hand } from 'lucide-react'
import { lazy, Suspense, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { Img } from '@/components/Img'
import { usePageTitle } from '@/components/Layout'
import { ProductCard, Reveal } from '@/components/ui'
import { BlurReveal } from '@/components/vendor/blur-reveal'
import { TextHighlighter } from '@/components/vendor/text-highlighter'
import { categories } from '@/data/products'
import { faq, store, whatsappLink } from '@/data/store'
import { totalStock } from '@/lib/shop'
import { useReducedMotion, useShop } from '@/lib/utils'

// Canvas UI effect needs the experimental HTML-in-Canvas API (drawElementImage). It is loaded only
// where that API exists, on wide fine-pointer screens without reduced motion; everyone else gets the photo.
const PaintedCanvas = lazy(() => import('@/components/vendor/canvas'))
const supportsHtmlInCanvas = (() => {
  if (typeof document === 'undefined') return false
  const probe = document.createElement('canvas') as HTMLCanvasElement & { requestPaint?: unknown }
  const ctx = probe.getContext('2d') as (CanvasRenderingContext2D & { drawElementImage?: unknown }) | null
  return typeof ctx?.drawElementImage === 'function' && typeof probe.requestPaint === 'function'
})()
const wideQuery = typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px) and (pointer: fine)') : null
const useWideFinePointer = () =>
  useSyncExternalStore(
    (fn) => (wideQuery?.addEventListener('change', fn), () => wideQuery?.removeEventListener('change', fn)),
    () => (wideQuery?.matches ?? false) && supportsHtmlInCanvas,
    () => false,
  )

function StorefrontPhoto() {
  return (
    <figure className="relative h-full">
      <Img src="fachada-1" alt="Fachada da Arte Nossa na Rua Santana, 221, com toldos verdes e vitrines" className="size-full rounded-lg" sizesAttr="(min-width: 1024px) 45vw, 100vw" />
      <figcaption className="absolute right-4 bottom-4 left-4 rounded-md bg-paper/92 px-4 py-3 text-sm font-semibold backdrop-blur">
        Rua Santana, 221 · Lavras – MG
      </figcaption>
    </figure>
  )
}

export function Home() {
  usePageTitle('')
  const { data } = useShop()
  const reduced = useReducedMotion()
  const wide = useWideFinePointer()
  const featured = data.products.filter((p) => p.featured && totalStock(p) > 0).slice(0, 8)
  const fallbackFeatured = featured.length ? featured : data.products.slice(0, 8)

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="container-page grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-20">
          <div>
            <p className="eyebrow mb-5 flex items-center gap-2">
              <span aria-hidden className="inline-block h-px w-8 bg-accent" />
              Decoração & presentes · Lavras, MG
            </p>
            {/* Rendered immediately: the main headline is the LCP and must be readable before any animation. */}
            <h1 className="text-[2.6rem] leading-[1.02] sm:text-6xl lg:text-7xl">Peças escolhidas à mão para casas com história.</h1>
            <p className="mt-6 max-w-xl text-lg text-ink-2">
              Esculturas, vasos, mesa posta e presentes com curadoria. Visite a loja na Rua Santana ou monte sua seleção por aqui e fale com a gente.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/produtos" className="btn-primary h-12 px-6 text-base">
                Ver produtos <ArrowRight aria-hidden className="size-4" />
              </Link>
              <a href={whatsappLink('Olá, Arte Nossa! Vim pelo site.')} target="_blank" rel="noreferrer" className="btn-outline h-12 px-6 text-base">
                <MessageCircle aria-hidden className="size-4" /> WhatsApp
              </a>
            </div>
          </div>
          <div className="grid grid-cols-[1.35fr_1fr] gap-3 sm:gap-4">
            <Link to="/produto/vasos-murano" className="group relative row-span-2 overflow-hidden rounded-lg" aria-label="Vasos de Murano">
              <Img src="vasos-murano-1" alt="Dois vasos de Murano em tons de branco, âmbar e verde" priority className="aspect-[3/4] size-full transition-transform duration-700 group-hover:scale-[1.03]" sizesAttr="(min-width: 1024px) 28vw, 58vw" />
            </Link>
            <Link to="/produto/escultura-mart-tarsila" className="group overflow-hidden rounded-lg" aria-label="Escultura MART + Tarsila">
              <Img src="tarsila-1" alt="Escultura em tom areia inspirada no Abaporu" priority className="aspect-square size-full transition-transform duration-700 group-hover:scale-[1.04]" sizesAttr="(min-width: 1024px) 20vw, 40vw" />
            </Link>
            <Link to="/produto/bandejas-inox-wolff" className="group overflow-hidden rounded-lg" aria-label="Bandejas em inox Wolff">
              <Img src="bandejas-wolff-1" alt="Bandejas retangulares em inox empilhadas" className="aspect-square size-full transition-transform duration-700 group-hover:scale-[1.04]" sizesAttr="(min-width: 1024px) 20vw, 40vw" />
            </Link>
          </div>
        </div>
      </section>

      {/* Promise strip */}
      <section aria-label="Diferenciais" className="border-y border-line bg-card">
        <ul className="container-page grid gap-6 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Hand, t: 'Selecionadas à mão', d: 'Peças escolhidas após curadoria.' },
            { icon: Sparkles, t: 'Curadoria no ambiente', d: 'Levamos peças para você ver no seu espaço.' },
            { icon: Truck, t: 'Entregas', d: 'Em Lavras e para todo o Brasil.' },
            { icon: Gift, t: 'Listas de casamento', d: 'Presentes que ficam para sempre.' },
          ].map(({ icon: Icon, t, d }) => (
            <li key={t} className="flex gap-3">
              <Icon aria-hidden className="mt-1 size-5 shrink-0 text-teal" />
              <div>
                <p className="font-semibold">{t}</p>
                <p className="text-sm text-ink-2">{d}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Featured */}
      <section className="container-page pt-20">
        <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-2">Novidades da vitrine</p>
            {reduced ? (
              <h2 className="text-3xl sm:text-4xl">Destaques</h2>
            ) : (
              <BlurReveal as="h2" inView className="text-3xl sm:text-4xl" speedReveal={2} speedSegment={0.8}>
                Destaques
              </BlurReveal>
            )}
          </div>
          <Link to="/produtos" className="link inline-flex min-h-11 items-center gap-1">
            Ver catálogo completo <ArrowRight aria-hidden className="size-4" />
          </Link>
        </Reveal>
        <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {fallbackFeatured.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      </section>

      {/* Categories */}
      <section className="container-page pt-24">
        <Reveal className="mb-8">
          <p className="eyebrow mb-2">Para cada canto da casa</p>
          <h2 className="text-3xl sm:text-4xl">Categorias</h2>
        </Reveal>
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {categories.map((c, i) => (
            <li key={c.id} className={i === 0 ? 'col-span-2 row-span-2' : i >= 5 ? 'md:col-span-2' : ''}>
              <Link to={`/produtos?categoria=${c.id}`} className="group relative block h-full overflow-hidden rounded-lg">
                <Img
                  src={c.cover}
                  alt=""
                  className={`size-full transition-transform duration-700 group-hover:scale-[1.04] ${i === 0 ? 'aspect-square' : i >= 5 ? 'aspect-[4/5] md:aspect-[2/1]' : 'aspect-[4/5]'}`}
                  sizesAttr={i === 0 || i >= 5 ? '(min-width: 768px) 50vw, 100vw' : '(min-width: 768px) 25vw, 50vw'}
                />
                <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/10 to-transparent" />
                <span className="absolute right-4 bottom-4 left-4 text-paper">
                  <span className={`block font-display ${i === 0 ? 'text-3xl' : 'text-xl'}`}>{c.name}</span>
                  {i === 0 && <span className="mt-1 block text-sm text-paper/85">{c.blurb}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* About */}
      <section id="sobre" className="container-page scroll-mt-24 pt-24">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal className="order-2 lg:order-1">
            <p className="eyebrow mb-3">A loja</p>
            <h2 className="text-3xl sm:text-5xl">
              Uma vitrine na Rua Santana, um olhar de{' '}
              {reduced ? (
                <mark className="bg-accent-soft px-1 text-ink">curadoria</mark>
              ) : (
                <TextHighlighter highlightColor="var(--color-accent-soft)" transition={{ type: 'spring', duration: 1.2, delay: 0.3, bounce: 0 }}>
                  curadoria
                </TextHighlighter>
              )}
              .
            </h2>
            <div className="mt-6 space-y-4 text-lg text-ink-2">
              <p>
                A Arte Nossa trabalha com peças de decoração de alta qualidade, cuidadosamente selecionadas à mão e escolhidas para garantir beleza, durabilidade e elegância aos
                ambientes.
              </p>
              <p>
                Além da loja física em Lavras, fazemos curadoria levando peças para você visualizar e escolher diretamente no ambiente. E montamos listas de casamento com presentes
                que ficam para sempre.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={store.mapsUrl} target="_blank" rel="noreferrer" className="btn-primary">
                Como chegar
              </a>
              <a href={store.instagram} target="_blank" rel="noreferrer" className="btn-outline">
                Ver no Instagram
              </a>
            </div>
          </Reveal>
          <Reveal className="order-1 aspect-square lg:order-2" delay={0.1}>
            {wide && !reduced ? (
              <Suspense fallback={<StorefrontPhoto />}>
                <PaintedCanvas className="size-full overflow-hidden rounded-lg" intro={1.4} strength={0.85} tint={[0.96, 0.94, 0.9]} radius={0.12}>
                  <StorefrontPhoto />
                </PaintedCanvas>
              </Suspense>
            ) : (
              <StorefrontPhoto />
            )}
          </Reveal>
        </div>
      </section>

      {/* Wedding list */}
      <section className="container-page pt-24">
        <Reveal className="grid overflow-hidden rounded-lg bg-teal text-paper md:grid-cols-[1fr_1.1fr]">
          <Img src="faqueiro-dourado-1" alt="Faqueiro dourado de 72 peças em maleta" className="aspect-[4/3] size-full md:aspect-auto" sizesAttr="(min-width: 768px) 45vw, 100vw" />
          <div className="p-8 sm:p-12">
            <p className="eyebrow mb-3 text-paper/70">Listas de casamento</p>
            <h2 className="text-3xl text-paper sm:text-4xl">Presentes para começar a casa com beleza.</h2>
            <p className="mt-4 text-paper/85">Faqueiros, aparelhos de jantar, cristais e bandejas. Fale com a loja para montar ou consultar uma lista.</p>
            <a href={whatsappLink('Olá! Gostaria de informações sobre lista de casamento.')} target="_blank" rel="noreferrer" className="btn-accent mt-8">
              <MessageCircle aria-hidden className="size-4" /> Consultar pelo WhatsApp
            </a>
          </div>
        </Reveal>
      </section>

      {/* FAQ */}
      <section className="container-page pt-24" aria-labelledby="faq-title">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <Reveal>
            <p className="eyebrow mb-3">Dúvidas</p>
            <h2 id="faq-title" className="text-3xl sm:text-4xl">
              Perguntas frequentes
            </h2>
            <p className="mt-4 text-ink-2">Respostas publicadas pela própria loja.</p>
          </Reveal>
          <div className="divide-y divide-line border-y border-line">
            {faq.map((f) => (
              <details key={f.q} className="group py-1">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full border border-line transition-transform duration-300 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="pb-5 text-ink-2">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
