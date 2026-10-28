import { lazy, Suspense } from 'react'
import { HashRouter, Link, Route, Routes, useParams } from 'react-router-dom'
import { Layout, usePageTitle } from '@/components/Layout'
import { Bag } from '@/pages/Bag'
import { Home } from '@/pages/Home'
import { Product } from '@/pages/Product'
import { Products } from '@/pages/Products'

// Rarely visited, heavier routes load on demand to keep the first page light.
const Admin = lazy(() => import('@/pages/admin/Admin').then((m) => ({ default: m.Admin })))
const Checkout = lazy(() => import('@/pages/Checkout').then((m) => ({ default: m.Checkout })))
const Payment = lazy(() => import('@/pages/Order').then((m) => ({ default: m.Payment })))
const Confirmation = lazy(() => import('@/pages/Order').then((m) => ({ default: m.Confirmation })))

const Loading = () => (
  <p role="status" className="container-page min-h-[80vh] py-24 text-center text-ink-2">
    Carregando…
  </p>
)
const page = (el: React.ReactNode) => <Suspense fallback={<Loading />}>{el}</Suspense>

// Remount per product so variant/quantity state never leaks between products.
function ProductRoute() {
  const { id } = useParams()
  return <Product key={id} />
}

function NotFound() {
  usePageTitle('Página não encontrada')
  return (
    <div className="container-page py-24 text-center">
      <h1 className="text-4xl">Página não encontrada</h1>
      <p className="mt-3 text-ink-2">O endereço pode ter mudado.</p>
      <Link to="/" className="btn-primary mt-8">Voltar ao início</Link>
    </div>
  )
}

// HashRouter: GitHub Pages has no server rewrites, so refreshing /#/produtos never 404s.
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="produtos" element={<Products />} />
          <Route path="produto/:id" element={<ProductRoute />} />
          <Route path="sacola" element={<Bag />} />
          <Route path="checkout" element={page(<Checkout />)} />
          <Route path="pedido/:id/pagamento" element={page(<Payment />)} />
          <Route path="pedido/:id" element={page(<Confirmation />)} />
          <Route path="gerencia" element={page(<Admin />)} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
