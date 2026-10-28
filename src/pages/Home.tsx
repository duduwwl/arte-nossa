import { ArrowLeft, ArrowRight, ChevronDown } from 'lucide-react'
import { motion, useInView, useScroll, useTransform } from 'motion/react'
import { lazy, Suspense, useRef, useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { Img } from '@/components/Img'
import { usePageTitle } from '@/components/Layout'
import { Reveal } from '@/components/ui'
import { BlurReveal } from '@/components/vendor/blur-reveal'
import { InfiniteSlider } from '@/components/vendor/infinite-slider'
import { TextLoop } from '@/components/vendor/text-loop'
import VerticalCutReveal from '@/components/vendor/vertical-cut-reveal'
import { categories } from '@/data/products'
import { faq, store, whatsappLink } from '@/data/store'
import type { Product } from '@/data/types'
import { formatCents, totalStock } from '@/lib/shop'
import { cn, useReducedMotion, useShop } from '@/lib/utils'

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
    () => wideQuery?.matches ?? false,
    () => false,
  )

/** Section title revealed letter by letter (Fancy VerticalCutReveal) once it enters the screen. */
function CutTitle({ children, className, id }: { children: string; className?: string; id?: string }) {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLHeadingElement>(null)
  const seen = useInView(ref, { once: true, margin: '0px 0px -15% 0px' })
  // Readable before it is seen; the cut reveal only plays once the title enters the screen.
  return (
    <h2 ref={ref} id={id} className={className}>
      {reduced || !seen ? (
        children
      ) : (
        <VerticalCutReveal autoStart splitBy="characters" staggerDuration={0.025} transition={{ type: 'spring', stiffness: 190, damping: 24 }}>
          {children}
        </VerticalCutReveal>
      )}
    </h2>
  )
}

// --- 1. Hero: the name and the street hold still while the shop window rolls between them ---
const reel = ['vasos-murano-1', 'tarsila-1', 'familia-latao-1', 'escultura-passaro-1', 'rechaud-petiscos-1']

function Hero() {
  const reduced = useReducedMotion()
  const stage = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: stage, offset: ['start start', 'end end'] })
  // Each slide is exactly one frame tall (h-full), so the reel moves in frame heights: no measuring, no layout shift.
  const y = useTransform(scrollYProgress, [0, 0.9], [0, reel.length - 1], { clamp: true })
  const transform = useTransform(y, (v) => `translateY(calc(${-v} * (100% + 1.5rem)))`)

  return (
    <section ref={stage} aria-labelledby="titulo" className={cn('relative', !reduced && 'lg:h-[260svh]')}>
      <div className={cn('container-page flex min-h-[calc(100svh-4.5rem)] flex-col pt-6 pb-8', !reduced && 'lg:sticky lg:top-18 lg:h-[calc(100svh-4.5rem)]')}>
        <h1 id="titulo" className="relative grid flex-1 items-center gap-4 text-[clamp(4rem,15vw,8rem)] lg:grid-cols-[1fr_26vw_1fr] lg:gap-8 lg:text-[clamp(5rem,9.5vw,10rem)]">
          <span className="block">Arte Nossa</span>
          <span aria-hidden className="relative row-start-2 block aspect-[4/3] overflow-hidden rounded-md bg-paper-2 lg:row-start-auto lg:aspect-[4/5]">
            <motion.span className="flex h-full flex-col gap-6" style={reduced ? undefined : { transform }}>
              {reel.map((src, i) => (
                <span key={src} className="block h-full shrink-0">
                  <Img src={src} alt="" priority={i === 0} className="size-full" sizesAttr="(min-width: 1024px) 26vw, 100vw" />
                </span>
              ))}
            </motion.span>
          </span>
          <span className="row-start-3 block text-right text-[clamp(3rem,11vw,6rem)] lg:row-start-auto lg:text-[clamp(3.5rem,5.8vw,6.5rem)]">Rua Santana 221</span>
        </h1>
        <div className="mt-6 grid gap-5 sm:grid-cols-[minmax(0,34rem)_auto] sm:items-end sm:justify-between">
          <p className="text-lg">
            Loja de decoração e presentes em Lavras, MG:{' '}
            {reduced ? (
              <span className="font-semibold text-accent">esculturas, vasos, mesa posta e listas de casamento</span>
            ) : (
              <TextLoop className="align-bottom font-semibold text-accent" interval={2.2}>
                {['esculturas', 'vasos de Murano', 'mesa posta', 'arte sacra', 'listas de casamento']}
              </TextLoop>
            )}
            , escolhidos à mão para a sua casa.
          </p>
          <Link to="/produtos" className="btn-primary h-14 px-7 text-lg">
            Ver a vitrine <ArrowRight aria-hidden className="size-5" />
          </Link>
        </div>
      </div>
    </section>
  )
}

// --- 2. This week's window: product cards travel across a held photograph ---
const panelTones = ['bg-paper-2', 'bg-[#2b2410]', 'bg-card', 'bg-[#1d2420]', 'bg-[#26201c]', 'bg-paper-2', 'bg-[#2b2410]', 'bg-card']

function ShowcaseCard({ p, i }: { p: Product; i: number }) {
  return (
    <li className="w-[min(82vw,36rem)] shrink-0 snap-start">
      <Link to={`/produto/${p.id}`} className="group block overflow-hidden rounded-md">
        <span className="block aspect-[4/3] overflow-hidden">
          <Img src={p.images[0]} alt="" className="size-full transition-transform duration-700 group-hover:scale-[1.04]" sizesAttr="(min-width: 768px) 36rem, 82vw" />
        </span>
        <span className={cn('flex min-h-36 flex-col justify-between gap-3 p-6 sm:flex-row sm:items-end', panelTones[i % panelTones.length])}>
          <span className="font-display text-2xl uppercase leading-none sm:text-4xl">{p.name}</span>
          <span className="shrink-0 text-base sm:text-right">
            {formatCents(p.priceCents)}
            <span className="block text-ink-2">valor fictício</span>
          </span>
        </span>
      </Link>
    </li>
  )
}

function Showcase({ products }: { products: Product[] }) {
  const track = useRef<HTMLUListElement>(null)
  const go = (d: number) => track.current?.scrollBy({ left: d * Math.min(track.current.clientWidth * 0.8, 600), behavior: 'smooth' })
  return (
    <section aria-labelledby="vitrine" className="relative mt-24 overflow-hidden py-16 sm:py-24">
      <Img src="lanternas-fibra-1" alt="" className="absolute inset-0 size-full brightness-[0.45]" sizesAttr="100vw" />
      <div className="relative">
        <div className="container-page mb-10 flex flex-wrap items-end justify-between gap-6">
          <CutTitle id="vitrine" className="text-[clamp(3rem,7vw,7rem)]">
            Vitrine da semana
          </CutTitle>
          <div className="flex gap-2">
            <button type="button" className="btn-outline size-14 p-0" onClick={() => go(-1)} aria-label="Peças anteriores">
              <ArrowLeft aria-hidden className="size-5" />
            </button>
            <button type="button" className="btn-primary size-14 p-0" onClick={() => go(1)} aria-label="Próximas peças">
              <ArrowRight aria-hidden className="size-5" />
            </button>
          </div>
        </div>
        <ul
          ref={track}
          className="flex snap-x snap-mandatory gap-6 overflow-x-auto px-4 pb-4 [scrollbar-width:none] sm:px-6 lg:px-8 [&::-webkit-scrollbar]:hidden"
          tabIndex={0}
          aria-label="Peças em destaque, role para o lado"
        >
          {products.map((p, i) => (
            <ShowcaseCard key={p.id} p={p} i={i} />
          ))}
        </ul>
      </div>
    </section>
  )
}

// --- 3. Every corner of the house: a held photograph answers the active category ---
function Corners() {
  const { data } = useShop()
  const [active, setActive] = useState(0)
  const counts = Object.fromEntries(categories.map((c) => [c.id, data.products.filter((p) => p.category === c.id).length]))
  const reduced = useReducedMotion()

  return (
    <section aria-labelledby="cantos" className="container-page mt-40 grid gap-10 lg:grid-cols-12">
      <div className="lg:sticky lg:top-[12vh] lg:col-span-5 lg:self-start">
        <div className="relative aspect-[4/3] overflow-hidden rounded-md lg:aspect-[4/5]">
          {categories.map((c, i) => (
            <motion.div key={c.id} className="absolute inset-0" initial={false} animate={{ opacity: i === active ? 1 : 0 }} transition={{ duration: reduced ? 0 : 0.3 }}>
              <Img src={c.cover} alt={i === active ? c.name : ''} className="size-full" sizesAttr="(min-width: 1024px) 40vw, 100vw" />
            </motion.div>
          ))}
        </div>
      </div>
      <div className="lg:col-span-6 lg:col-start-7">
        <CutTitle id="cantos" className="mb-10 text-[clamp(3rem,7vw,7rem)]">
          Para cada canto
        </CutTitle>
        <ul>
          {categories.map((c, i) => (
            <li key={c.id} onMouseEnter={() => setActive(i)} className="py-2">
              <button
                type="button"
                aria-expanded={i === active}
                onClick={() => setActive(i)}
                onFocus={() => setActive(i)}
                className={cn('flex min-h-14 w-full items-baseline justify-between gap-4 text-left transition-colors', i === active ? 'text-accent' : 'text-ink hover:text-accent')}
              >
                <span className="font-display text-4xl uppercase leading-none">{c.name}</span>
                <span className="text-base text-ink-2 tabular-nums">{counts[c.id]} peças</span>
              </button>
              {i === active && (
                <motion.div initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-start gap-3 pt-1 pb-5 sm:flex-row-reverse sm:items-center sm:justify-end sm:gap-4">
                  <Link to={`/produtos?categoria=${c.id}`} className="btn-primary min-h-11 shrink-0">
                    Ver as {counts[c.id]} peças <ArrowRight aria-hidden className="size-4" />
                  </Link>
                  <p className="max-w-[34ch] text-lg sm:flex-1">{c.blurb}</p>
                </motion.div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

// A moving strip of the real pieces (Motion Primitives InfiniteSlider); decorative, the catalog lists them all.
function Strip({ products }: { products: Product[] }) {
  const reduced = useReducedMotion()
  const items = products.slice(0, 14).map((p) => (
    <Img key={p.id} src={p.images[0]} alt="" className="h-40 w-32 shrink-0 rounded-md sm:h-56 sm:w-44" sizesAttr="176px" />
  ))
  return (
    <div aria-hidden className="mt-32">
      {reduced ? <div className="flex gap-4 overflow-hidden">{items}</div> : <InfiniteSlider gap={16} speed={40} speedOnHover={12}>{items}</InfiniteSlider>}
    </div>
  )
}

// --- 4. The shop ---
const shopFacts = [
  { img: 'fachada-1', title: 'Rua Santana, 221', text: 'Uma vitrine em Lavras que muda toda semana. Entre, veja as peças de perto e leve para casa.' },
  { img: 'lanternas-fibra-1', title: 'Curadoria no ambiente', text: 'Levamos peças até você para ver e escolher direto no espaço, compondo cada canto.' },
  { img: 'bandeja-champanhe-1', title: 'Entregas em todo o Brasil', text: 'Entregamos em Lavras e enviamos para outras cidades. Prazo e taxa são combinados na compra.' },
  { img: 'faqueiro-dourado-2', title: 'Listas de casamento', text: 'Faqueiros, aparelhos de jantar, cristais e bandejas: presentes que ficam para sempre.' },
]

function Shop() {
  return (
    <section id="loja" aria-labelledby="loja-titulo" className="container-page mt-40 scroll-mt-24">
      <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
        <h2 id="loja-titulo" className="text-[clamp(3rem,7vw,7rem)] lg:col-span-7">
          A loja
        </h2>
        <p className="text-lg lg:col-span-5 lg:pb-4">
          Peças de decoração de alta qualidade,{' '}
          <strong className="font-semibold text-accent">selecionadas à mão</strong>{' '}
          depois de uma curadoria pensada em beleza, durabilidade e elegância.
        </p>
      </div>
      <ul className="mt-16 grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-4">
        {shopFacts.map((f, i) => (
          <li key={f.title} className={cn(i % 2 === 1 && 'lg:mt-24')}>
            <Reveal delay={i * 0.08}>
              <Img src={f.img} alt="" className="aspect-[4/5] w-full rounded-md" sizesAttr="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 100vw" />
              <h3 className="mt-5 text-4xl">{f.title}</h3>
              <p className="mt-2 text-lg">{f.text}</p>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  )
}

// --- 5. One piece, full screen, slowly coming closer ---
function FullBleed() {
  const ref = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const scale = useTransform(scrollYProgress, [0, 1], [1.12, 1])
  return (
    <section ref={ref} aria-labelledby="tarsila" className="relative mt-40 h-[88svh] overflow-hidden sm:h-[100svh]">
      <motion.div className="absolute inset-0" style={reduced ? undefined : { scale }}>
        <Img src="tarsila-1" alt="Escultura em tom areia inspirada no Abaporu, da collab MART + Tarsila" className="size-full" sizesAttr="100vw" />
      </motion.div>
      <div className="absolute inset-x-0 bottom-0 bg-paper/80 py-6">
        <div className="container-page flex flex-wrap items-end justify-between gap-4">
          <h2 id="tarsila" className="text-[clamp(3rem,7vw,7rem)]">
            MART + Tarsila
          </h2>
          <Link to="/produto/escultura-mart-tarsila" className="link inline-flex min-h-11 items-center gap-1 text-lg">
            A collab que leva Tarsila do Amaral para a decoração <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

// --- 6. Questions beside a tall photograph ---
function Questions() {
  return (
    <section aria-labelledby="duvidas" className="mt-40 bg-paper-2 py-24">
      <div className="container-page grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h2 id="duvidas" className="text-[clamp(3rem,7vw,7rem)]">
            Dúvidas
          </h2>
          <ul className="mt-8 space-y-1 text-lg">
            <li>{store.address}</li>
            <li>
              WhatsApp{' '}
              <a href={whatsappLink()} target="_blank" rel="noreferrer" className="link">
                {store.whatsappDisplay}
              </a>
            </li>
            <li>
              Instagram{' '}
              <a href={store.instagram} target="_blank" rel="noreferrer" className="link">
                {store.instagramHandle}
              </a>
            </li>
          </ul>
          <div className="mt-10 space-y-7">
            {faq.map((f) => (
              <details key={f.q} className="group">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold hover:text-accent [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <ChevronDown aria-hidden className="size-5 shrink-0 text-accent transition-transform duration-300 group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-lg text-ink-2">{f.a}</p>
              </details>
            ))}
          </div>
          <a href={whatsappLink('Olá, Arte Nossa! Tenho uma dúvida.')} target="_blank" rel="noreferrer" className="btn-primary mt-10">
            Perguntar no WhatsApp
          </a>
        </div>
        <div className="relative lg:col-span-6 lg:col-start-7 lg:-mt-40">
          <Img src="cachepos-indianos-1" alt="Cachepôs de metal indianos feitos à mão" className="aspect-[3/4] w-full rounded-md" sizesAttr="(min-width: 1024px) 45vw, 100vw" />
          <Img src="sousplat-fibra-2" alt="Sousplat em fibra natural" className="absolute -bottom-10 -left-4 aspect-square w-[38%] rounded-md sm:-left-10" sizesAttr="(min-width: 1024px) 17vw, 38vw" />
        </div>
      </div>
    </section>
  )
}

// --- 7. Visit card on the shopfront ---
function VisitPhoto() {
  return <Img src="fachada-1" alt="Fachada da Arte Nossa na Rua Santana, 221, com toldos verdes e vitrines" className="size-full" sizesAttr="100vw" />
}

function Visit() {
  const reduced = useReducedMotion()
  const wide = useWideFinePointer()
  return (
    <section id="contato" aria-labelledby="visite" className="relative mt-40 scroll-mt-18 sm:h-[100svh]">
      <div className="h-[70svh] sm:absolute sm:inset-0 sm:h-auto">
        {wide && !reduced && supportsHtmlInCanvas ? (
          <Suspense fallback={<VisitPhoto />}>
            <PaintedCanvas className="size-full overflow-hidden" intro={1.4} strength={0.85} radius={0.12}>
              <VisitPhoto />
            </PaintedCanvas>
          </Suspense>
        ) : (
          <VisitPhoto />
        )}
      </div>
      <div className="relative mx-4 -mt-20 rounded-lg bg-paper p-8 sm:absolute sm:top-16 sm:right-8 sm:mx-0 sm:mt-0 sm:w-[24rem]">
        <h2 id="visite" className="text-4xl">
          Visite a loja
        </h2>
        <p className="mt-4 text-lg">
          Rua Santana, 221
          <br />
          Lavras – MG
        </p>
        <p className="mt-3 text-lg">
          Horários e encomendas pelo WhatsApp{' '}
          <a href={whatsappLink('Olá! Qual o horário da loja hoje?')} target="_blank" rel="noreferrer" className="link">
            {store.whatsappDisplay}
          </a>
        </p>
        <a href={store.mapsUrl} target="_blank" rel="noreferrer" className="btn-primary mt-8 h-14 w-full">
          Como chegar
        </a>
      </div>
    </section>
  )
}

export function Home() {
  usePageTitle('')
  const { data } = useShop()
  const reduced = useReducedMotion()
  const featured = data.products.filter((p) => p.featured && totalStock(p) > 0)
  const showcase = (featured.length >= 4 ? featured : data.products).slice(0, 8)

  return (
    <>
      <Hero />
      {showcase.length > 0 && <Showcase products={showcase} />}
      <Corners />
      <Strip products={data.products} />
      <Shop />
      <FullBleed />
      <Questions />
      <Visit />
      <section aria-labelledby="fim" className="container-page mt-40 grid gap-8 lg:grid-cols-12 lg:items-end">
        {reduced ? (
          <h2 id="fim" className="text-[clamp(3rem,7vw,7rem)] lg:col-span-8">
            Monte sua seleção
          </h2>
        ) : (
          <BlurReveal as="h2" inView className="text-[clamp(3rem,7vw,7rem)] lg:col-span-8" speedReveal={2} speedSegment={0.8}>
            Monte sua seleção
          </BlurReveal>
        )}
        <div className="lg:col-span-4">
          <p className="text-lg">Escolha as peças no catálogo, junte na sacola e envie a lista pronta para o WhatsApp da loja.</p>
          <Link to="/produtos" className="btn-primary mt-6 h-14 w-full px-7 text-lg">
            Abrir o catálogo <ArrowRight aria-hidden className="size-5" />
          </Link>
        </div>
      </section>
    </>
  )
}
