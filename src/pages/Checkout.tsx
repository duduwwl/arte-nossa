import { CreditCard, QrCode } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Img } from '@/components/Img'
import { usePageTitle } from '@/components/Layout'
import { Alert, DemoNotice, EmptyBag, PageHeader } from '@/components/ui'
import type { Customer, Delivery, PaymentMethod } from '@/data/types'
import { newOrderId, placeOrder } from '@/lib/db'
import { bagSubtotal, deliveryOptions, type Errors, formatCents, paymentLabel, resolveBag, shippingCents, validateCustomer, validateDelivery } from '@/lib/shop'
import { cn, useReducedMotion, useShop } from '@/lib/utils'

const DRAFT_KEY = 'arte-nossa:checkout'
interface Draft {
  step: number
  orderId: string
  customer: Customer
  delivery: Delivery
  payment: PaymentMethod
}
const emptyDraft = (): Draft => ({
  step: 0,
  orderId: newOrderId(),
  customer: { name: '', email: '', phone: '' },
  delivery: { method: 'retirada', cep: '', street: '', number: '', city: 'Lavras', uf: 'MG' },
  payment: 'pix',
})
function loadDraft(): Draft {
  try {
    const d = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? 'null')
    if (d && typeof d.orderId === 'string' && d.customer && d.delivery) return { ...emptyDraft(), ...d }
  } catch {
    /* storage unavailable: start fresh */
  }
  return emptyDraft()
}
const saveDraft = (d: Draft) => {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d))
  } catch {
    /* keep in memory only */
  }
}
const clearDraft = () => {
  try {
    sessionStorage.removeItem(DRAFT_KEY)
  } catch {
    /* ignore */
  }
}

const steps = ['Identificação', 'Entrega', 'Pagamento', 'Revisão']

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-2">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="error-text">
          {error}
        </p>
      )}
    </div>
  )
}
const aria = (id: string, error?: string, hint?: boolean) => ({
  id,
  'aria-invalid': Boolean(error),
  'aria-describedby': error ? `${id}-error` : hint ? `${id}-hint` : undefined,
})

export function Checkout() {
  usePageTitle('Checkout')
  const { data, bag } = useShop()
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const [draft, setDraft] = useState(loadDraft)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)

  useEffect(() => saveDraft(draft), [draft])
  useEffect(() => {
    if (firstRender.current) firstRender.current = false
    else headingRef.current?.focus()
  }, [draft.step])

  const lines = resolveBag(bag, data.products)
  const subtotal = bagSubtotal(lines)
  const ship = shippingCents(draft.delivery.method)

  if (!lines.length)
    return (
      <>
        <PageHeader title="Checkout">Adicione produtos à sacola antes de finalizar o pedido de demonstração.</PageHeader>
        <div className="container-page py-6">
          <EmptyBag />
        </div>
      </>
    )

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }))
  const setC = (k: keyof Customer, v: string) => set('customer', { ...draft.customer, [k]: v })
  const setD = (k: keyof Delivery, v: string) => set('delivery', { ...draft.delivery, [k]: v } as Delivery)

  const next = () => {
    let e: Errors<Record<string, string>> = {}
    if (draft.step === 0) e = validateCustomer(draft.customer)
    if (draft.step === 1) e = validateDelivery(draft.delivery)
    setErrors(e as Record<string, string>)
    if (Object.keys(e).length) {
      requestAnimationFrame(() => (document.querySelector('[aria-invalid="true"]') as HTMLElement | null)?.focus())
      return
    }
    set('step', draft.step + 1)
  }
  const back = () => (setErrors({}), set('step', Math.max(0, draft.step - 1)))

  const confirm = () => {
    if (submitting) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const order = placeOrder({ orderId: draft.orderId, customer: draft.customer, delivery: draft.delivery, paymentMethod: draft.payment })
      clearDraft()
      navigate(`/pedido/${order.id}/pagamento`, { replace: true })
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Não foi possível registrar o pedido.')
      setSubmitting(false)
    }
  }

  return (
    <>
      <PageHeader eyebrow="Checkout de demonstração" title="Finalizar pedido" />
      <div className="container-page py-10">
        <DemoNotice className="mb-8" />
        <ol className="mb-8 grid grid-cols-4 gap-2" aria-label="Etapas">
          {steps.map((s, i) => (
            <li key={s} aria-current={i === draft.step ? 'step' : undefined} className="text-center sm:text-left">
              <span className={cn('block h-1 rounded-full', i <= draft.step ? 'bg-ink' : 'bg-line')} />
              <span className={cn('mt-2 block text-xs font-semibold sm:text-sm', i === draft.step ? 'text-ink' : 'text-ink-2')}>
                <span className="sr-only">Etapa {i + 1}: </span>
                {s}
              </span>
            </li>
          ))}
        </ol>

        <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
          <section aria-labelledby="etapa">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={draft.step}
                initial={reduced ? false : { opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduced ? undefined : { opacity: 0, x: -16 }}
                transition={{ duration: 0.22 }}
              >
                <h2 id="etapa" ref={headingRef} tabIndex={-1} className="mb-6 text-3xl focus:outline-none">
                  {steps[draft.step]}
                </h2>

                {draft.step === 0 && (
                  <form className="grid max-w-xl gap-5" onSubmit={(e) => (e.preventDefault(), next())} noValidate>
                    <Alert tone="info">Use apenas dados fictícios. Esta demonstração não precisa de dados pessoais reais.</Alert>
                    <Field id="nome" label="Nome" error={errors.name}>
                      <input {...aria('nome', errors.name)} className="field" autoComplete="off" value={draft.customer.name} onChange={(e) => setC('name', e.target.value)} placeholder="Ex.: Maria Teste" />
                    </Field>
                    <Field id="email" label="E-mail" error={errors.email}>
                      <input {...aria('email', errors.email)} type="email" className="field" autoComplete="off" value={draft.customer.email} onChange={(e) => setC('email', e.target.value)} placeholder="teste@exemplo.com" />
                    </Field>
                    <Field id="tel" label="Telefone" error={errors.phone}>
                      <input {...aria('tel', errors.phone)} type="tel" inputMode="tel" className="field" autoComplete="off" value={draft.customer.phone} onChange={(e) => setC('phone', e.target.value)} placeholder="(35) 90000-0000" />
                    </Field>
                    <div className="flex gap-3">
                      <Link to="/sacola" className="btn-outline">Voltar à sacola</Link>
                      <button className="btn-primary">Continuar</button>
                    </div>
                  </form>
                )}

                {draft.step === 1 && (
                  <form className="grid max-w-xl gap-5" onSubmit={(e) => (e.preventDefault(), next())} noValidate>
                    <fieldset>
                      <legend className="label">Forma de entrega</legend>
                      <div className="grid gap-2">
                        {deliveryOptions.map((o) => (
                          <label key={o.id} className={cn('flex min-h-14 cursor-pointer items-center gap-3 rounded-md border px-4 py-3 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-teal', draft.delivery.method === o.id ? 'border-ink bg-card' : 'border-line')}>
                            <input type="radio" name="entrega" checked={draft.delivery.method === o.id} onChange={() => setD('method', o.id)} className="size-5 accent-teal" />
                            <span className="flex-1">
                              <span className="block font-semibold">{o.label}</span>
                              <span className="block text-sm text-ink-2">{o.note}</span>
                            </span>
                            <span className="font-semibold tabular-nums">{o.cents ? formatCents(o.cents) : 'Grátis'}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    {draft.delivery.method !== 'retirada' && (
                      <div className="grid gap-5 sm:grid-cols-6">
                        <div className="sm:col-span-2">
                          <Field id="cep" label="CEP" error={errors.cep}>
                            <input {...aria('cep', errors.cep)} inputMode="numeric" className="field" autoComplete="off" value={draft.delivery.cep} onChange={(e) => setD('cep', e.target.value)} placeholder="00000-000" />
                          </Field>
                        </div>
                        <div className="sm:col-span-4">
                          <Field id="rua" label="Rua" error={errors.street}>
                            <input {...aria('rua', errors.street)} className="field" autoComplete="off" value={draft.delivery.street} onChange={(e) => setD('street', e.target.value)} />
                          </Field>
                        </div>
                        <div className="sm:col-span-2">
                          <Field id="numero" label="Número" error={errors.number}>
                            <input {...aria('numero', errors.number)} className="field" autoComplete="off" value={draft.delivery.number} onChange={(e) => setD('number', e.target.value)} />
                          </Field>
                        </div>
                        <div className="sm:col-span-3">
                          <Field id="cidade" label="Cidade" error={errors.city}>
                            <input {...aria('cidade', errors.city)} className="field" autoComplete="off" value={draft.delivery.city} onChange={(e) => setD('city', e.target.value)} />
                          </Field>
                        </div>
                        <div className="sm:col-span-1">
                          <Field id="uf" label="UF" error={errors.uf}>
                            <input {...aria('uf', errors.uf)} maxLength={2} className="field uppercase" autoComplete="off" value={draft.delivery.uf} onChange={(e) => setD('uf', e.target.value.toUpperCase())} />
                          </Field>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-3">
                      <button type="button" className="btn-outline" onClick={back}>Voltar</button>
                      <button className="btn-primary">Continuar</button>
                    </div>
                  </form>
                )}

                {draft.step === 2 && (
                  <form className="grid max-w-xl gap-5" onSubmit={(e) => (e.preventDefault(), next())}>
                    <fieldset>
                      <legend className="label">Forma de pagamento simulada</legend>
                      <div className="grid gap-2">
                        {(['pix', 'credito', 'debito'] as const).map((m) => (
                          <label key={m} className={cn('flex min-h-14 cursor-pointer items-center gap-3 rounded-md border px-4 py-3 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-teal', draft.payment === m ? 'border-ink bg-card' : 'border-line')}>
                            <input type="radio" name="pagamento" checked={draft.payment === m} onChange={() => set('payment', m)} className="size-5 accent-teal" />
                            {m === 'pix' ? <QrCode aria-hidden className="size-5" /> : <CreditCard aria-hidden className="size-5" />}
                            <span className="font-semibold">{paymentLabel[m]}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <p className="text-sm text-ink-2">Nenhum dado financeiro é solicitado. A simulação acontece depois da revisão.</p>
                    <div className="flex gap-3">
                      <button type="button" className="btn-outline" onClick={back}>Voltar</button>
                      <button className="btn-primary">Revisar pedido</button>
                    </div>
                  </form>
                )}

                {draft.step === 3 && (
                  <div className="grid max-w-xl gap-6">
                    <dl className="card space-y-1 p-1 text-base">
                      {[
                        ['Cliente', `${draft.customer.name} · ${draft.customer.email} · ${draft.customer.phone}`, 0],
                        [
                          'Entrega',
                          draft.delivery.method === 'retirada'
                            ? 'Retirar na loja · Rua Santana, 221 – Lavras – MG'
                            : `${deliveryOptions.find((o) => o.id === draft.delivery.method)!.label} · ${draft.delivery.street}, ${draft.delivery.number} · ${draft.delivery.city}/${draft.delivery.uf} · CEP ${draft.delivery.cep}`,
                          1,
                        ],
                        ['Pagamento', paymentLabel[draft.payment], 2],
                      ].map(([t, v, s]) => (
                        <div key={t as string} className="flex items-start justify-between gap-4 p-4">
                          <div>
                            <dt className="font-semibold">{t}</dt>
                            <dd className="mt-1 text-ink-2">{v}</dd>
                          </div>
                          <button type="button" className="link shrink-0" onClick={() => set('step', s as number)}>
                            Alterar<span className="sr-only"> {t}</span>
                          </button>
                        </div>
                      ))}
                    </dl>
                    {submitError && (
                      <Alert>
                        {submitError}{' '}
                        <Link to="/sacola" className="font-semibold underline">
                          Revisar sacola
                        </Link>
                      </Alert>
                    )}
                    <div className="flex flex-wrap gap-3">
                      <button type="button" className="btn-outline" onClick={back}>Voltar</button>
                      <button type="button" className="btn-primary h-12 px-6 text-base" onClick={confirm} disabled={submitting} aria-busy={submitting}>
                        {submitting ? 'Registrando…' : 'Confirmar pedido de demonstração'}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </section>

          <aside aria-labelledby="resumo-checkout" className="card h-fit p-6 lg:sticky lg:top-24">
            <h2 id="resumo-checkout" className="text-2xl">Resumo</h2>
            <ul className="mt-4 space-y-3">
              {lines.map((l) => (
                <li key={l.item.productId + l.item.variantId} className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 text-sm">
                  <Img src={l.variant?.image ?? l.product?.images[0] ?? ''} alt="" className="size-12 rounded" sizesAttr="48px" />
                  <span>
                    {l.item.qty}× {l.product?.name ?? 'Produto indisponível'}
                    {l.variant && l.product!.variants.length > 1 && <span className="block text-ink-2">{l.variant.label}</span>}
                  </span>
                  <span className="tabular-nums">{formatCents(l.lineCents)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-5 space-y-2 rounded-md bg-card p-4 text-base">
              <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{formatCents(subtotal)}</dd></div>
              <div className="flex justify-between"><dt>Entrega (fictícia)</dt><dd className="tabular-nums">{ship ? formatCents(ship) : 'Grátis'}</dd></div>
              <div className="flex justify-between text-base font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatCents(subtotal + ship)}</dd></div>
            </dl>
          </aside>
        </div>
      </div>
    </>
  )
}
