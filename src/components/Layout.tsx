import { Menu, ShoppingBag } from 'lucide-react'
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

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn('rounded-md px-3 py-2 text-base font-semibold transition-colors hover:text-accent', isActive ? 'text-accent' : 'text-ink')

function Header() {
  const { bag } = useShop()
  const count = bagCount(bag)
  const [open, setOpen] = useState(false)
  const goTo = useGoToSection()

  return (
    <header className="sticky top-0 z-40 bg-paper">
      <div className="container-page flex h-18 items-center gap-3">
        <Link to="/" className="flex items-center gap-3 rounded-md" aria-label="Arte Nossa, página inicial">
          <img src={`${base}favicon.png`} alt="" width={44} height={44} className="size-11 shrink-0 rounded-full" />
          <span className="font-display text-2xl uppercase">Arte Nossa</span>
        </Link>
        <nav aria-label="Principal" className="ml-auto hidden items-center gap-1 md:flex">
          <NavLink to="/produtos" className={navClass}>
            Produtos
          </NavLink>
          <button type="button" onClick={() => goTo('loja')} className="rounded-md px-3 py-2 text-base font-semibold hover:text-accent">
            A loja
          </button>
          <button type="button" onClick={() => goTo('contato')} className="rounded-md px-3 py-2 text-base font-semibold hover:text-accent">
            Visitar
          </button>
          <NavLink to="/gerencia" className={navClass}>
            Gerência
          </NavLink>
        </nav>
        <Link to="/sacola" className="btn-primary relative ml-auto min-h-11 px-4 md:ml-3" aria-label={`Sacola, ${count} ${count === 1 ? 'item' : 'itens'}`}>
          <ShoppingBag aria-hidden className="size-5" />
          <span aria-hidden className="tabular-nums">
            {count}
          </span>
        </Link>
        <button type="button" className="btn-outline min-h-11 px-3 md:hidden" onClick={() => setOpen(true)} aria-label="Abrir menu" aria-expanded={open}>
          <Menu aria-hidden className="size-5" />
        </button>
      </div>
      <Dialog open={open} onClose={() => setOpen(false)} title="Menu" className="mt-0 mr-0 h-dvh max-h-dvh w-[min(100vw,22rem)] rounded-none">
        <nav aria-label="Menu móvel" className="flex flex-col gap-1">
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
              className={({ isActive }) => cn('rounded-md px-3 py-3 font-display text-3xl uppercase', isActive ? 'text-accent' : 'text-ink')}
            >
              {l.label}
            </NavLink>
          ))}
          <button type="button" className="rounded-md px-3 py-3 text-left font-display text-3xl uppercase" onClick={() => (setOpen(false), goTo('loja'))}>
            A loja
          </button>
          <button type="button" className="rounded-md px-3 py-3 text-left font-display text-3xl uppercase" onClick={() => (setOpen(false), goTo('contato'))}>
            Visitar
          </button>
          <a href={whatsappLink()} target="_blank" rel="noreferrer" className="btn-primary mt-6">
            Falar no WhatsApp
          </a>
        </nav>
      </Dialog>
    </header>
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
