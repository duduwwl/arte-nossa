import { CheckCircle2, Clock, CreditCard, QrCode, XCircle } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Img } from '@/components/Img'
import { usePageTitle } from '@/components/Layout'
import { Alert, DemoNotice, PageHeader } from '@/components/ui'
import type { Order, PaymentMethod } from '@/data/types'
import { setPaymentStatus } from '@/lib/db'
import { deliveryOptions, formatCents, orderStatusLabel, paymentLabel } from '@/lib/shop'
import { cn, formatDateTime, useReducedMotion, useShop } from '@/lib/utils'

function OrderSummary({ order }: { order: Order }) {
  return (
    <div className="card p-6">
      <ul className="space-y-3">
        {order.items.map((i) => (
          <li key={i.productId + i.variantId} className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 text-sm">
            <Img src={i.image} alt="" className="size-14 rounded" sizesAttr="56px" />
            <span>
              {i.qty}× {i.name}
              {i.variantLabel !== 'Único' && <span className="block text-ink-2">{i.variantLabel}</span>}
            </span>
            <span className="tabular-nums">{formatCents(i.priceCents * i.qty)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-5 space-y-2 rounded-md bg-card p-4 text-base">
        <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{formatCents(order.subtotalCents)}</dd></div>
        <div className="flex justify-between">
          <dt>{deliveryOptions.find((d) => d.id === order.delivery.method)?.label ?? 'Entrega'}</dt>
          <dd className="tabular-nums">{order.shippingCents ? formatCents(order.shippingCents) : 'Grátis'}</dd>
        </div>
        <div className="flex justify-between text-base font-semibold"><dt>Total (fictício)</dt><dd className="tabular-nums">{formatCents(order.totalCents)}</dd></div>
      </dl>
    </div>
  )
}

/** Purely decorative pattern. It encodes nothing and cannot be scanned as a Pix QR Code. */
function FakePixArt() {
  const cells = Array.from({ length: 81 }, (_, i) => (i * 37 + (i % 7) * 11) % 5 < 2)
  return (
    <div className="relative mx-auto w-44">
      <div aria-hidden className="grid grid-cols-9 gap-0.5 rounded-md bg-card p-3 opacity-40">
        {cells.map((on, i) => (
          <span key={i} className={cn('aspect-square rounded-[1px]', on ? 'bg-ink' : 'bg-paper-2')} />
        ))}
      </div>
      <span className="absolute inset-0 grid place-items-center">
        <span className="rounded-md bg-paper px-3 py-2 text-center text-sm font-bold text-ink">
          ILUSTRAÇÃO
          <br />
          não é um QR Code
        </span>
      </span>
    </div>
  )
}

export function Payment() {
  const { id } = useParams()
  const { data } = useShop()
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const order = data.orders.find((o) => o.id === id)
  usePageTitle('Pagamento simulado')
  const [method, setMethod] = useState<PaymentMethod>(order?.payment.method ?? 'pix')
  const [busy, setBusy] = useState(false)

  if (!order) return <Navigate to="/" replace />
  if (order.payment.status === 'aprovado' || order.payment.status === 'estornado') return <Navigate to={`/pedido/${order.id}`} replace />

  const simulate = (ok: boolean) => {
    if (busy) return
    setBusy(true)
    // Short delay only to make the simulated processing state visible.
    setTimeout(() => {
      setPaymentStatus(order.id, ok ? 'aprovado' : 'recusado', method)
      setBusy(false)
      if (ok) navigate(`/pedido/${order.id}`, { replace: true })
      else window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
    }, reduced ? 0 : 700)
  }

  const cancelled = order.status === 'cancelado'

  return (
    <>
      <PageHeader eyebrow={`Pedido ${order.id}`} title="Pagamento simulado" />
      <div className="container-page grid gap-10 py-10 lg:grid-cols-[1fr_22rem]">
        <section className="max-w-xl">
          <DemoNotice className="mb-6" />
          {cancelled ? (
            <Alert>Este pedido foi cancelado na gerência e não aceita pagamento.</Alert>
          ) : (
            <>
              {order.payment.status === 'recusado' && (
                <Alert className="mb-6">
                  <strong>Pagamento simulado recusado.</strong> Nada foi cobrado. Tente novamente ou escolha outra forma de pagamento.
                </Alert>
              )}
              <fieldset className="mb-6">
                <legend className="label">Forma de pagamento</legend>
                <div className="flex flex-wrap gap-2">
                  {(['pix', 'credito', 'debito'] as const).map((m) => (
                    <button key={m} type="button" className="chip" aria-pressed={method === m} onClick={() => setMethod(m)}>
                      {paymentLabel[m]}
                    </button>
                  ))}
                </div>
              </fieldset>

              {method === 'pix' ? (
                <div className="card p-6 text-center">
                  <QrCode aria-hidden className="mx-auto size-6 text-teal" />
                  <p className="mt-2 inline-flex items-center gap-2 font-semibold">
                    <Clock aria-hidden className="size-4" /> Aguardando pagamento simulado
                  </p>
                  <div className="my-5">
                    <FakePixArt />
                  </div>
                  <p className="text-sm text-ink-2">Nenhum código Pix é gerado. Use o botão abaixo para simular a confirmação.</p>
                  <button type="button" className="btn-primary mt-5 w-full" onClick={() => simulate(true)} disabled={busy} aria-busy={busy}>
                    {busy ? 'Processando simulação…' : 'Simular pagamento aprovado'}
                  </button>
                  <button type="button" className="btn-ghost mt-2 w-full" onClick={() => simulate(false)} disabled={busy}>
                    Simular falha no Pix
                  </button>
                </div>
              ) : (
                <div className="card p-6">
                  <motion.div
                    initial={reduced ? false : { rotateX: 12, opacity: 0 }}
                    animate={{ rotateX: 0, opacity: 1 }}
                    className="relative mx-auto aspect-[1.586] w-full max-w-sm overflow-hidden rounded-xl bg-accent p-5 text-paper"
                    aria-label="Cartão fictício ilustrativo"
                    role="img"
                  >
                    <span className="badge absolute top-4 right-4 bg-paper text-ink">Simulação</span>
                    <CreditCard aria-hidden className="size-8 opacity-80" />
                    <p className="mt-6 text-xl font-semibold tabular-nums">•••• •••• •••• 0000</p>
                    <p className="mt-4 text-base font-semibold">Cartão fictício · {method === 'credito' ? 'crédito' : 'débito'}</p>
                  </motion.div>
                  <p className="mt-5 text-sm text-ink-2">Não digite dados de cartão. Nenhum número, CVV ou dado financeiro é solicitado ou armazenado.</p>
                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    <button type="button" className="btn-primary" onClick={() => simulate(true)} disabled={busy} aria-busy={busy}>
                      {busy ? 'Processando…' : 'Simular aprovação'}
                    </button>
                    <button type="button" className="btn-outline" onClick={() => simulate(false)} disabled={busy}>
                      Simular recusa
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
        <aside aria-label="Resumo do pedido" className="h-fit lg:sticky lg:top-24">
          <OrderSummary order={order} />
        </aside>
      </div>
    </>
  )
}

export function Confirmation() {
  const { id } = useParams()
  const { data } = useShop()
  const order = data.orders.find((o) => o.id === id)
  usePageTitle(order ? `Pedido ${order.id}` : 'Pedido não encontrado')
  if (!order)
    return (
      <div className="container-page py-24 text-center">
        <h1 className="text-4xl">Pedido não encontrado</h1>
        <p className="mt-3 text-ink-2">Os pedidos de demonstração ficam salvos apenas neste navegador.</p>
        <Link to="/" className="btn-primary mt-8">Voltar ao início</Link>
      </div>
    )
  if (order.payment.status === 'pendente' || order.payment.status === 'recusado') return <Navigate to={`/pedido/${order.id}/pagamento`} replace />

  const approved = order.payment.status === 'aprovado'
  return (
    <div className="container-page max-w-3xl py-14">
      <div className="text-center">
        {approved ? <CheckCircle2 aria-hidden className="mx-auto size-14 text-ok" /> : <XCircle aria-hidden className="mx-auto size-14 text-danger" />}
        <h1 className="mt-2 text-4xl sm:text-5xl">{approved ? 'Pagamento simulado aprovado' : 'Pedido cancelado'}</h1>
        <p className="mt-4 text-lg text-ink-2">
          Número do pedido: <strong className="text-accent tabular-nums">{order.id}</strong>
        </p>
        <p className="mt-1 text-sm text-ink-2">
          {formatDateTime(order.createdAt)} · Situação: {orderStatusLabel[order.status]} · {paymentLabel[order.payment.method]}
        </p>
      </div>
      <DemoNotice className="mt-8" />
      <div className="mt-8">
        <OrderSummary order={order} />
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/produtos" className="btn-primary">Continuar navegando</Link>
        <Link to="/gerencia?aba=pedidos" className="btn-outline">Ver na gerência</Link>
      </div>
    </div>
  )
}
