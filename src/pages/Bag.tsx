import { MessageCircle, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Link, useNavigate } from 'react-router-dom'
import { Img } from '@/components/Img'
import { usePageTitle } from '@/components/Layout'
import { Alert, DemoNotice, EmptyBag, PageHeader, toast } from '@/components/ui'
import { PopStepper } from '@/components/vendor/pop-stepper'
import { whatsappLink } from '@/data/store'
import { setBag } from '@/lib/db'
import { bagSubtotal, formatCents, removeFromBag, resolveBag, setBagQty, type BagLine } from '@/lib/shop'
import { useReducedMotion, useShop } from '@/lib/utils'

function selectionMessage(lines: BagLine[]) {
  const items = lines
    .filter((l) => l.product)
    .map((l) => `• ${l.item.qty}× ${l.product!.name}${l.product!.variants.length > 1 ? ` (${l.variant?.label ?? 'opção removida'})` : ''}`)
  return ['Olá, Arte Nossa! Montei esta seleção pelo site e gostaria de consultar valores e disponibilidade:', '', ...items].join('\n')
}

export function Bag() {
  usePageTitle('Sacola')
  const { data, bag } = useShop()
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const lines = resolveBag(bag, data.products)
  const subtotal = bagSubtotal(lines)
  const hasProblem = lines.some((l) => l.problem)

  const remove = (l: BagLine) => {
    const before = bag
    setBag(removeFromBag(bag, l.item.productId, l.item.variantId))
    toast(`${l.product?.name ?? 'Item'} removido da sacola.`, { label: 'Desfazer', run: () => setBag(before) })
  }

  return (
    <>
      <PageHeader eyebrow="Sua seleção" title="Sacola" />
      <div className="container-page py-10">
        {lines.length === 0 ? (
          <EmptyBag />
        ) : (
          <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
            <ul className="stagger space-y-3">
              <AnimatePresence initial={false}>
                {lines.map((l) => (
                  <motion.li
                    key={l.item.productId + l.item.variantId}
                    layout={!reduced}
                    exit={reduced ? undefined : { opacity: 0, height: 0 }}
                    className="grid grid-cols-[5.5rem_1fr] gap-4 rounded-lg bg-paper-2 p-4 sm:grid-cols-[7rem_1fr_auto]"
                  >
                    <Img src={l.variant?.image ?? l.product?.images[0] ?? ''} alt="" className="aspect-square w-full rounded-md" sizesAttr="112px" />
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {l.product ? <Link to={`/produto/${l.product.id}`} className="hover:text-teal">{l.product.name}</Link> : 'Produto indisponível'}
                      </p>
                      {l.variant && l.product!.variants.length > 1 && <p className="text-sm text-ink-2">{l.variant.label}</p>}
                      {l.product && <p className="mt-1 text-sm text-ink-2 tabular-nums">{formatCents(l.product.priceCents)} cada</p>}
                      {l.problem === 'removido' && <Alert className="mt-3">Este item saiu do catálogo. Remova-o para continuar.</Alert>}
                      {l.problem === 'esgotado' && <Alert className="mt-3">Esta opção esgotou. Remova-a para continuar.</Alert>}
                      {l.problem === 'acima-do-estoque' && (
                        <Alert className="mt-3">
                          Restam só {l.variant!.stock} unidade(s).{' '}
                          <button type="button" className="font-semibold underline" onClick={() => setBag(setBagQty(bag, l.item.productId, l.item.variantId, l.variant!.stock, l.variant!.stock))}>
                            Ajustar quantidade
                          </button>
                        </Alert>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-3 sm:hidden">
                        {l.variant && !l.problem && <PopStepper value={l.item.qty} max={l.variant.stock} onChange={(q) => setBag(setBagQty(bag, l.item.productId, l.item.variantId, q, l.variant!.stock))} label={`Quantidade de ${l.product!.name}`} />}
                        <button type="button" className="btn-ghost text-danger" onClick={() => remove(l)}>
                          <Trash2 aria-hidden className="size-4" /> Remover
                        </button>
                      </div>
                    </div>
                    <div className="hidden flex-col items-end gap-3 sm:flex">
                      <p className="font-semibold tabular-nums">{formatCents(l.lineCents)}</p>
                      {l.variant && !l.problem && <PopStepper value={l.item.qty} max={l.variant.stock} onChange={(q) => setBag(setBagQty(bag, l.item.productId, l.item.variantId, q, l.variant!.stock))} label={`Quantidade de ${l.product!.name}`} />}
                      <button type="button" className="btn-ghost text-danger" onClick={() => remove(l)}>
                        <Trash2 aria-hidden className="size-4" /> Remover
                      </button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>

            <aside aria-labelledby="resumo" className="card h-fit p-6 lg:sticky lg:top-24">
              <h2 id="resumo" className="text-2xl">
                Resumo
              </h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt>Itens</dt>
                  <dd className="tabular-nums">{lines.filter((l) => !l.problem).reduce((n, l) => n + l.item.qty, 0)}</dd>
                </div>
                <div className="flex justify-between text-base font-semibold">
                  <dt>Subtotal</dt>
                  <dd className="tabular-nums">{formatCents(subtotal)}</dd>
                </div>
              </dl>
              <p className="mt-2 text-xs text-ink-2">Valores fictícios. Entrega calculada no checkout.</p>
              <button type="button" className="btn-primary mt-6 w-full" disabled={hasProblem} onClick={() => navigate('/checkout')}>
                Ir para o checkout (demo)
              </button>
              {hasProblem && <p className="mt-2 text-sm text-danger">Resolva os avisos da sacola para continuar.</p>}
              <a href={whatsappLink(selectionMessage(lines))} target="_blank" rel="noreferrer" className="btn-outline mt-3 w-full">
                <MessageCircle aria-hidden className="size-4" /> Enviar seleção pelo WhatsApp
              </a>
              <p className="mt-2 text-xs text-ink-2">Abre o WhatsApp oficial da loja com a lista pronta, para consultar valores reais.</p>
              <DemoNotice className="mt-6" />
            </aside>
          </div>
        )}
      </div>
    </>
  )
}
