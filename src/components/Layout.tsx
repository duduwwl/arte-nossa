import { Menu, ShoppingBag } from 'lucide-react'
import { motion, useMotionValueEvent, useScroll } from 'motion/react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { store, whatsappLink } from '@/data/store'
import { clearError } from '@/lib/db'
import { bagCount } from '@/lib/shop'
import { cn, useReducedMotion, useShop } from '@/lib/utils'
import { Dialog } from './Dialog'
import { Toaster } from './ui'
import { AnimatedBackground } from './vendor/animated-background'
import { Magnetic } from './vendor/magnetic'

const base = import.meta.env.BASE_URL

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · Arte Nossa` : 'Arte Nossa — Decoração & presentes em Lavras, MG'
  }, [title])
}

/** Navigates to a section of the home page (HashRouter owns the URL hash, so plain #anchors are not used). */
export function useGoToSection() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  return (id: string) => {
    if (pathname === '/') document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    else navigate('/', { state: { scrollTo: id } })
  }
}

function NavItem({ to, label, onClick, active }: { to?: string; label: string; onClick?: () => void; active?: boolean }) {
  const inner = (
    <span className="relative z-10 flex flex-col items-center px-4 py-2">
      {label}
      {active && <motion.span layoutId="nav-dot" className="absolute -bottom-0.5 size-1.5 rounded-full bg-accent" />}
    </span>
  )
  const cls = cn('rounded-full text-base font-medium transition-colors', active ? 'text-ink' : 'text-ink-2 hover:text-ink')
  return to ? (
    <Link to={to} className={cls} aria-current={active ? 'page' : undefined}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  )
}

function Header() {
  const { bag } = useShop()
  const count = bagCount(bag)
  const [open, setOpen] = useState(false)
  const goTo = useGoToSection()
  const { pathname } = useLocation()
  const reduced = useReducedMotion()
  const { scrollY } = useScroll()
  const [solid, setSolid] = useState(false)
  const [hidden, setHidden] = useState(false)

  // Transparent over the top of the page, solid once scrolled; slides away going down, back going up.
  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0
    setSolid(y > 24)
    setHidden(!open && y > 240 && y > prev + 4 ? true : y < prev - 4 ? false : hidden)
  })

  const links = [
    { id: 'produtos', to: '/produtos', label: 'Produtos', active: pathname.startsWith('/produto') },
    { id: 'loja', label: 'A loja', onClick: () => goTo('loja') },
    { id: 'visitar', label: 'Visitar', onClick: () => goTo('contato') },
    { id: 'gerencia', to: '/gerencia', label: 'Gerência', active: pathname === '/gerencia' },
  ]

  return (
    <motion.header
      className={cn('sticky top-0 z-40 transition-colors duration-300', solid ? 'bg-paper' : 'bg-transparent')}
      animate={{ y: hidden && !reduced ? '-100%' : '0%' }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="container-page flex h-18 items-center gap-3">
        <Link to="/" className="group flex items-center gap-3 rounded-full" aria-label="Arte Nossa, página inicial">
          <img
            src={`${base}favicon.png`}
            alt=""
            width={44}
            height={44}
            className="size-11 shrink-0 rounded-full transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:rotate-[-12deg]"
          />
          <span className="font-display text-3xl leading-none">Arte Nossa</span>
        </Link>
        <nav aria-label="Principal" className="ml-auto hidden items-center md:flex">
          <AnimatedBackground className="rounded-full bg-card" transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }} enableHover>
            {links.map((l) => (
              <div key={l.id} data-id={l.id}>
                <NavItem to={l.to} label={l.label} onClick={l.onClick} active={l.active} />
              </div>
            ))}
          </AnimatedBackground>
        </nav>
        <div className="ml-auto md:ml-3">
        <Magnetic intensity={reduced ? 0 : 0.3} range={80}>
          <Link to="/sacola" className="btn-primary relative min-h-11 px-4" aria-label={`Sacola, ${count} ${count === 1 ? 'item' : 'itens'}`}>
            <ShoppingBag aria-hidden className="size-5" />
            <motion.span
              key={count}
              aria-hidden
              className="tabular-nums"
              initial={reduced ? false : { scale: 1.8, y: -4 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 14 }}
            >
              {count}
            </motion.span>
          </Link>
        </Magnetic>
        </div>
        <button type="button" className="btn-outline min-h-11 px-3 md:hidden" onClick={() => setOpen(true)} aria-label="Abrir menu" aria-expanded={open}>
          <Menu aria-hidden className="size-5" />
        </button>
      </div>
      <Dialog open={open} onClose={() => setOpen(false)} title="Menu" className="mt-0 mr-0 h-dvh max-h-dvh w-[min(100vw,22rem)] rounded-none">
        <nav aria-label="Menu móvel" className="stagger flex flex-col gap-1">
          {[
            { to: '/', label: 'Início' },
            { to: '/produtos', label: 'Produtos' },
            { to: '/sacola', label: `Sacola (${count})` },
            { to: '/gerencia', label: 'Gerência (demo)' },
          ].map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end
              onClick={() => setOpen(false)}
              className={({ isActive }) => cn('rounded-md px-3 py-3 font-display text-4xl', isActive ? 'text-accent' : 'text-ink')}
            >
              {l.label}
            </NavLink>
          ))}
          <button type="button" className="rounded-md px-3 py-3 text-left font-display text-4xl" onClick={() => (setOpen(false), goTo('loja'))}>
            A loja
          </button>
          <button type="button" className="rounded-md px-3 py-3 text-left font-display text-4xl" onClick={() => (setOpen(false), goTo('contato'))}>
            Visitar
          </button>
          <a href={whatsappLink()} target="_blank" rel="noreferrer" className="btn-primary mt-6">
            Falar no WhatsApp
          </a>
        </nav>
      </Dialog>
    </motion.header>
  )
}

function Footer() {
  return (
    <footer className="container-page mt-[30svh] grid gap-2 pb-8 text-base md:grid-cols-[1fr_auto_1fr] md:items-baseline md:gap-6">
      <p className="text-ink-2">Arte Nossa · decoração & presentes · Lavras, MG</p>
      <nav aria-label="Rodapé" className="flex flex-wrap gap-x-6 gap-y-1">
        <Link to="/produtos" className="font-semibold hover:text-accent">Produtos</Link>
        <a href={whatsappLink('Olá, Arte Nossa! Vim pelo site.')} target="_blank" rel="noreferrer" className="font-semibold hover:text-accent">
          WhatsApp
        </a>
        <a href={store.instagram} target="_blank" rel="noreferrer" className="font-semibold hover:text-accent">
          Instagram
        </a>
        <Link to="/gerencia" className="font-semibold hover:text-accent">Gerência</Link>
      </nav>
      <p className="text-ink-2 md:text-right">Loja de demonstração: valores fictícios. Fotos © @artenossa.</p>
    </footer>
  )
}

function StorageError() {
  const { lastError } = useShop()
  if (!lastError) return null
  return (
    <div role="alert" className="bg-danger text-paper">
      <div className="container-page flex items-center justify-between gap-4 py-2 text-base">
        <span>{lastError}</span>
        <button type="button" className="min-h-11 rounded-md px-3 font-semibold underline" onClick={clearError}>
          Fechar aviso
        </button>
      </div>
    </div>
  )
}

export function Layout() {
  const { pathname, state } = useLocation()
  useEffect(() => {
    const target = (state as { scrollTo?: string } | null)?.scrollTo
    if (target) requestAnimationFrame(() => document.getElementById(target)?.scrollIntoView({ block: 'start' }))
    else window.scrollTo(0, 0)
  }, [pathname, state])

  return (
    <>
      <a href="#conteudo" onClick={(e) => (e.preventDefault(), document.getElementById('conteudo')?.focus())} className="sr-only z-50 rounded-md bg-accent px-4 py-3 text-paper focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Pular para o conteúdo
      </a>
      <StorageError />
      <Header />
      <main id="conteudo" tabIndex={-1} className="focus:outline-none">
        <Outlet />
      </main>
      <Footer />
      <Toaster />
    </>
  )
}
