import { ArrowUp, MapPin, Menu, MessageCircle, ShoppingBag } from 'lucide-react'
import { Instagram } from './Icons'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { store, whatsappLink } from '@/data/store'
import { clearError } from '@/lib/db'
import { bagCount } from '@/lib/shop'
import { cn, useShop } from '@/lib/utils'
import { Dialog } from './Dialog'
import { Toaster } from './ui'

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

function Brand({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn('flex items-center gap-3 rounded-md', className)} aria-label="Arte Nossa, página inicial">
      <img src={`${base}favicon.png`} alt="" width={44} height={44} className="size-11 shrink-0 rounded-full" />
      <span className="leading-none">
        <span className="block font-display text-xl font-semibold tracking-tight">Arte Nossa</span>
        <span className="mt-1 block text-[11px] font-semibold tracking-[0.16em] text-ink-2 uppercase">Lavras · MG</span>
      </span>
    </Link>
  )
}

const links = [
  { to: '/', label: 'Início', end: true },
  { to: '/produtos', label: 'Produtos' },
]

function Header() {
  const { bag } = useShop()
  const count = bagCount(bag)
  const [open, setOpen] = useState(false)
  const goTo = useGoToSection()
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])

  const navClass = ({ isActive }: { isActive: boolean }) =>
    cn('relative rounded-md px-3 py-2 text-sm font-semibold transition-colors hover:text-teal', isActive ? 'text-ink after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:bg-accent' : 'text-ink-2')

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/90 backdrop-blur-md">
      <div className="container-page flex h-18 items-center gap-4">
        <Brand />
        <nav aria-label="Principal" className="ml-auto hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={navClass}>
              {l.label}
            </NavLink>
          ))}
          <button type="button" onClick={() => goTo('sobre')} className="rounded-md px-3 py-2 text-sm font-semibold text-ink-2 hover:text-teal">
            A loja
          </button>
          <button type="button" onClick={() => goTo('contato')} className="rounded-md px-3 py-2 text-sm font-semibold text-ink-2 hover:text-teal">
            Contato
          </button>
          <NavLink to="/gerencia" className={navClass}>
            Gerência
          </NavLink>
        </nav>
        <Link to="/sacola" className="btn-outline relative ml-auto px-3 md:ml-2" aria-label={`Sacola, ${count} ${count === 1 ? 'item' : 'itens'}`}>
          <ShoppingBag aria-hidden className="size-5" />
          <span className="hidden sm:inline">Sacola</span>
          {count > 0 && (
            <span aria-hidden className="absolute -top-2 -right-2 grid min-w-6 place-items-center rounded-full bg-accent px-1.5 text-xs font-bold text-ink">
              {count}
            </span>
          )}
        </Link>
        <button type="button" className="btn-outline px-3 md:hidden" onClick={() => setOpen(true)} aria-label="Abrir menu" aria-expanded={open}>
          <Menu aria-hidden className="size-5" />
        </button>
      </div>
      <Dialog open={open} onClose={() => setOpen(false)} title="Menu" className="mt-0 mr-0 h-dvh max-h-dvh w-[min(100vw,22rem)] rounded-none">
        <nav aria-label="Menu móvel" className="flex flex-col gap-1 text-lg">
          {[...links, { to: '/sacola', label: `Sacola (${count})` }, { to: '/gerencia', label: 'Gerência (demo)' }].map((l) => (
            <NavLink key={l.to} to={l.to} end={'end' in l} className={({ isActive }) => cn('rounded-md px-3 py-3 font-semibold', isActive ? 'bg-paper-2 text-ink' : 'text-ink-2')}>
              {l.label}
            </NavLink>
          ))}
          <button type="button" className="rounded-md px-3 py-3 text-left font-semibold text-ink-2" onClick={() => (setOpen(false), goTo('sobre'))}>
            A loja
          </button>
          <button type="button" className="rounded-md px-3 py-3 text-left font-semibold text-ink-2" onClick={() => (setOpen(false), goTo('contato'))}>
            Contato
          </button>
          <a href={whatsappLink()} target="_blank" rel="noreferrer" className="btn-accent mt-6">
            <MessageCircle aria-hidden className="size-5" /> Falar no WhatsApp
          </a>
        </nav>
      </Dialog>
    </header>
  )
}

function Footer() {
  return (
    <footer id="contato" className="mt-24 bg-ink text-paper">
      <div className="container-page grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-display text-3xl">Arte Nossa</p>
          <p className="mt-2 text-paper/75">
            {store.tagline}. {store.extra}.
          </p>
          <a href={whatsappLink('Olá, Arte Nossa! Vim pelo site.')} target="_blank" rel="noreferrer" className="btn-accent mt-6">
            <MessageCircle aria-hidden className="size-5" /> WhatsApp {store.whatsappDisplay}
          </a>
        </div>
        <div>
          <h2 className="eyebrow mb-4 font-sans text-paper/60">Visite</h2>
          <address className="space-y-3 not-italic">
            <a href={store.mapsUrl} target="_blank" rel="noreferrer" className="flex gap-2 text-paper hover:text-accent">
              <MapPin aria-hidden className="mt-1 size-4 shrink-0" />
              {store.address}
            </a>
            <a href={store.instagram} target="_blank" rel="noreferrer" className="flex gap-2 text-paper hover:text-accent">
              <Instagram aria-hidden className="mt-1 size-4 shrink-0" />
              {store.instagramHandle}
            </a>
          </address>
        </div>
        <nav aria-label="Rodapé">
          <h2 className="eyebrow mb-4 font-sans text-paper/60">Navegue</h2>
          <ul className="space-y-2">
            <li><Link to="/" className="hover:text-accent">Início</Link></li>
            <li><Link to="/produtos" className="hover:text-accent">Produtos</Link></li>
            <li><Link to="/sacola" className="hover:text-accent">Sacola</Link></li>
            <li><Link to="/gerencia" className="hover:text-accent">Gerência (demonstração)</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-paper/15">
        <div className="container-page flex flex-col gap-4 py-6 text-sm text-paper/70 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Site de demonstração: preços, estoque e pedidos são fictícios. Fotos e textos: @artenossa.
          </p>
          <button type="button" className="inline-flex min-h-11 items-center gap-2 self-start rounded-md px-2 font-semibold text-paper hover:text-accent" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <ArrowUp aria-hidden className="size-4" /> Voltar ao topo
          </button>
        </div>
      </div>
    </footer>
  )
}

function StorageError() {
  const { lastError } = useShop()
  if (!lastError) return null
  return (
    <div role="alert" className="bg-danger text-white">
      <div className="container-page flex items-center justify-between gap-4 py-2 text-sm">
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
      <a href="#conteudo" onClick={(e) => (e.preventDefault(), document.getElementById('conteudo')?.focus())} className="sr-only z-50 rounded-md bg-ink px-4 py-3 text-paper focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
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
