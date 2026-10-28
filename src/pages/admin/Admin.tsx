import { Download, Pencil, Plus, RotateCcw, Search, Trash2, Upload } from 'lucide-react'
import { type ReactNode, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Dialog } from '@/components/Dialog'
import { Img } from '@/components/Img'
import { usePageTitle } from '@/components/Layout'
import { Alert, StockBadge, toast } from '@/components/ui'
import { categories, categoryName } from '@/data/products'
import type { Order, OrderStatus, Product } from '@/data/types'
import { adjustStock, deleteProduct, exportData, importData, isPersistent, resetData, saveProduct, setOrderStatus } from '@/lib/db'
import { deliveryOptions, formatCents, isLowStock, orderStatusLabel, paymentLabel, queryCatalog, totalStock } from '@/lib/shop'
import { cn, formatDateTime, useShop } from '@/lib/utils'
import { ProductEditor } from './ProductEditor'

const tabs = [
  { id: 'painel', label: 'Painel' },
  { id: 'produtos', label: 'Produtos' },
  { id: 'estoque', label: 'Estoque' },
  { id: 'pedidos', label: 'Pedidos' },
  { id: 'dados', label: 'Dados' },
] as const

const paymentStatusLabel: Record<Order['payment']['status'], string> = {
  pendente: 'Pagamento pendente',
  aprovado: 'Pagamento simulado aprovado',
  recusado: 'Pagamento simulado recusado',
  estornado: 'Pagamento simulado estornado',
}

function Confirm({ open, title, children, confirmLabel, onConfirm, onClose }: { open: boolean; title: string; children: ReactNode; confirmLabel: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <div className="text-ink-2">{children}</div>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button type="button" className="btn-outline" onClick={onClose}>Voltar</button>
        <button type="button" className="btn-danger" onClick={() => (onConfirm(), onClose())}>{confirmLabel}</button>
      </div>
    </Dialog>
  )
}

function Dashboard({ go }: { go: (t: string) => void }) {
  const { data } = useShop()
  const valid = data.orders.filter((o) => o.status !== 'cancelado')
  const total = valid.filter((o) => o.payment.status === 'aprovado').reduce((n, o) => n + o.totalCents, 0)
  const low = data.products.flatMap((p) => p.variants.filter((v) => v.stock <= 2).map((v) => ({ p, v })))
  const cards = [
    { label: 'Pedidos (não cancelados)', value: String(valid.length), tab: 'pedidos' },
    { label: 'Total simulado aprovado', value: formatCents(total), tab: 'pedidos' },
    { label: 'Opções com estoque baixo ou esgotadas', value: String(low.length), tab: 'estoque' },
    { label: 'Produtos cadastrados', value: String(data.products.length), tab: 'produtos' },
  ]
  return (
    <div className="grid gap-8">
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <li key={c.label}>
            <button type="button" onClick={() => go(c.tab)} className="card w-full p-5 text-left transition-colors hover:border-ink">
              <span className="block text-sm text-ink-2">{c.label}</span>
              <span className="mt-2 block font-display text-3xl tabular-nums">{c.value}</span>
            </button>
          </li>
        ))}
      </ul>
      <section>
        <h2 className="mb-3 text-2xl">Atenção ao estoque</h2>
        {low.length === 0 ? (
          <p className="text-ink-2">Nenhuma opção com estoque baixo.</p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {low.slice(0, 8).map(({ p, v }) => (
              <li key={p.id + v.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span>{p.name}{p.variants.length > 1 && <span className="text-ink-2"> · {v.label}</span>}</span>
                <StockBadge stock={v.stock} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function ProductsTab() {
  const { data } = useShop()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [editing, setEditing] = useState<Product | 'new' | null>(null)
  const [removing, setRemoving] = useState<Product | null>(null)
  const list = useMemo(() => queryCatalog(data.products, { text: q, category: cat, sort: 'nome' }), [data.products, q, cat])

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="relative min-w-60 flex-1">
          <label htmlFor="adm-q" className="label">Buscar</label>
          <Search aria-hidden className="pointer-events-none absolute bottom-3 left-3 size-5 text-ink-2" />
          <input id="adm-q" type="search" className="field pl-10" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div>
          <label htmlFor="adm-cat" className="label">Categoria</label>
          <select id="adm-cat" className="field" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">Todas</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button type="button" className="btn-primary" onClick={() => setEditing('new')}>
          <Plus aria-hidden className="size-4" /> Novo produto
        </button>
      </div>
      <p className="mb-2 text-sm text-ink-2" aria-live="polite">{list.length} produto(s)</p>
      {list.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-8 text-center text-ink-2">Nenhum produto encontrado.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {list.map((p) => (
            <li key={p.id} className="grid grid-cols-[3.5rem_1fr] items-center gap-3 py-3 sm:grid-cols-[3.5rem_1fr_auto_auto]">
              <Img src={p.images[0] ?? ''} alt="" className="size-14 rounded" sizesAttr="56px" />
              <div className="min-w-0">
                <p className="truncate font-semibold">{p.name}</p>
                <p className="text-sm text-ink-2">{categoryName(p.category)} · {formatCents(p.priceCents)} · {totalStock(p)} em estoque</p>
              </div>
              <div className="col-span-2 sm:col-span-1"><StockBadge stock={totalStock(p)} /></div>
              <div className="col-span-2 flex gap-2 sm:col-span-1">
                <button type="button" className="btn-outline" onClick={() => setEditing(p)}>
                  <Pencil aria-hidden className="size-4" /> Editar<span className="sr-only"> {p.name}</span>
                </button>
                <button type="button" className="btn-ghost text-danger" onClick={() => setRemoving(p)}>
                  <Trash2 aria-hidden className="size-4" /> Remover<span className="sr-only"> {p.name}</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Novo produto' : 'Editar produto'} className="w-[min(100vw-1rem,64rem)]">
        {editing && (
          <ProductEditor
            product={editing === 'new' ? undefined : editing}
            existingIds={data.products.map((p) => p.id)}
            onCancel={() => setEditing(null)}
            onSave={(p) => {
              saveProduct(p)
              toast(editing === 'new' ? 'Produto cadastrado.' : 'Alterações salvas.')
              setEditing(null)
            }}
          />
        )}
      </Dialog>
      <Confirm
        open={!!removing}
        title="Remover produto?"
        confirmLabel="Remover produto"
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          if (!removing) return
          deleteProduct(removing.id)
          toast(`${removing.name} removido. Pedidos antigos mantêm seus dados.`)
        }}
      >
        <p>
          <strong className="text-ink">{removing?.name}</strong> sairá do catálogo e das sacolas. Pedidos já feitos continuam com o nome, a opção e o preço registrados na compra.
        </p>
      </Confirm>
    </div>
  )
}

function StockRow({ p, v }: { p: Product; v: Product['variants'][number] }) {
  const [value, setValue] = useState(String(v.stock))
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const id = `${p.id}-${v.id}`
  const apply = () => {
    setError('')
    if (!/^\d+$/.test(value.trim())) return setError('Use um número inteiro ≥ 0.')
    try {
      adjustStock(p.id, v.id, Number(value), note)
      setNote('')
      toast(`Estoque de ${p.name}${p.variants.length > 1 ? ` (${v.label})` : ''} atualizado.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao ajustar estoque.')
    }
  }
  return (
    <li className="grid gap-3 py-4 md:grid-cols-[1fr_auto] md:items-center">
      <div className="flex items-center gap-3">
        <Img src={p.images[0] ?? ''} alt="" className="size-12 shrink-0 rounded" sizesAttr="48px" />
        <div className="min-w-0">
          <p className="font-semibold">{p.name}</p>
          <p className="text-sm text-ink-2">{v.label} · atual: <span className="tabular-nums">{v.stock}</span> <StockBadge stock={v.stock} /></p>
        </div>
      </div>
      <form className="flex flex-wrap items-start gap-2" onSubmit={(e) => (e.preventDefault(), apply())} noValidate>
        <div>
          <label htmlFor={`st-${id}`} className="sr-only">Novo estoque de {p.name} {v.label}</label>
          <input id={`st-${id}`} inputMode="numeric" className="field w-24" value={value} onChange={(e) => setValue(e.target.value)} aria-invalid={!!error} aria-describedby={error ? `st-e-${id}` : undefined} />
          {error && <p id={`st-e-${id}`} className="error-text">{error}</p>}
        </div>
        <div>
          <label htmlFor={`nt-${id}`} className="sr-only">Motivo do ajuste</label>
          <input id={`nt-${id}`} className="field w-48" placeholder="Motivo (opcional)" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <button className="btn-outline" disabled={value.trim() === String(v.stock)}>Ajustar</button>
      </form>
    </li>
  )
}

function StockTab() {
  const { data } = useShop()
  const [filter, setFilter] = useState<'todos' | 'baixo' | 'esgotado'>('todos')
  const rows = data.products
    .flatMap((p) => p.variants.map((v) => ({ p, v })))
    .filter(({ v }) => (filter === 'baixo' ? isLowStock(v.stock) : filter === 'esgotado' ? v.stock === 0 : true))
  return (
    <div className="grid gap-10 xl:grid-cols-[1.4fr_1fr]">
      <section>
        <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Filtrar estoque">
          {(['todos', 'baixo', 'esgotado'] as const).map((f) => (
            <button key={f} type="button" className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === 'todos' ? 'Todos' : f === 'baixo' ? 'Estoque baixo' : 'Esgotados'}
            </button>
          ))}
        </div>
        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line p-8 text-center text-ink-2">Nada nesta lista.</p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {rows.map(({ p, v }) => <StockRow key={`${p.id}-${v.id}-${v.stock}`} p={p} v={v} />)}
          </ul>
        )}
      </section>
      <section aria-labelledby="mov">
        <h2 id="mov" className="mb-3 text-2xl">Movimentações</h2>
        <p className="mb-3 text-sm text-ink-2">Regra de cancelamento: ao cancelar um pedido, cada item volta ao estoque uma única vez. Cancelar de novo não devolve outra vez.</p>
        {data.movements.length === 0 ? (
          <p className="text-ink-2">Nenhuma movimentação registrada.</p>
        ) : (
          <ol className="max-h-[36rem] divide-y divide-line overflow-y-auto border-y border-line text-sm">
            {data.movements.slice(0, 100).map((m) => (
              <li key={m.id} className="flex justify-between gap-3 py-2">
                <span>
                  <span className="font-semibold">{m.productName}</span>
                  {m.variantLabel !== 'Único' && ` · ${m.variantLabel}`}
                  <span className="block text-ink-2">
                    {formatDateTime(m.at)} · {m.reason}
                    {m.orderId && ` · ${m.orderId}`}
                    {m.note && ` · ${m.note}`}
                  </span>
                </span>
                <span className={cn('font-semibold tabular-nums', m.delta > 0 ? 'text-ok' : 'text-danger')}>{m.delta > 0 ? `+${m.delta}` : m.delta}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}

function OrdersTab() {
  const { data } = useShop()
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const list = data.orders.filter((o) => !status || o.status === status)
  const open = data.orders.find((o) => o.id === openId)

  const change = (id: string, s: OrderStatus) => {
    setError('')
    try {
      setOrderStatus(id, s)
      toast(`Pedido ${id}: ${orderStatusLabel[s]}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar o pedido.')
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrar por situação">
        <button type="button" className="chip" aria-pressed={!status} onClick={() => setStatus('')}>Todos ({data.orders.length})</button>
        {(Object.keys(orderStatusLabel) as OrderStatus[]).map((s) => (
          <button key={s} type="button" className="chip" aria-pressed={status === s} onClick={() => setStatus(s)}>
            {orderStatusLabel[s]} ({data.orders.filter((o) => o.status === s).length})
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-8 text-center text-ink-2">Nenhum pedido de demonstração{status && ' nesta situação'}.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {list.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p className="font-mono font-semibold">{o.id} <span className="badge ml-1 bg-accent-soft font-sans text-ink">DEMO</span></p>
                <p className="text-sm text-ink-2">{formatDateTime(o.createdAt)} · {o.items.reduce((n, i) => n + i.qty, 0)} item(ns) · {formatCents(o.totalCents)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge bg-paper-2">{orderStatusLabel[o.status]}</span>
                <span className={cn('badge', o.payment.status === 'aprovado' ? 'bg-ok-soft text-ok' : o.payment.status === 'recusado' ? 'bg-danger-soft text-danger' : 'bg-paper-2')}>
                  {paymentStatusLabel[o.payment.status]}
                </span>
                <button type="button" className="btn-outline" onClick={() => setOpenId(o.id)}>Detalhes<span className="sr-only"> do pedido {o.id}</span></button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!open} onClose={() => setOpenId(null)} title={open ? `Pedido ${open.id} (demonstração)` : 'Pedido'} className="w-[min(100vw-1rem,48rem)]">
        {open && (
          <div className="grid gap-6">
            {error && <Alert>{error}</Alert>}
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="font-semibold">Situação do pedido</dt><dd>{orderStatusLabel[open.status]}</dd></div>
              <div><dt className="font-semibold">Situação do pagamento</dt><dd>{paymentStatusLabel[open.payment.status]} · {paymentLabel[open.payment.method]} · {open.payment.attempts} tentativa(s)</dd></div>
              <div><dt className="font-semibold">Cliente (fictício)</dt><dd>{open.customer.name}<br />{open.customer.email} · {open.customer.phone}</dd></div>
              <div>
                <dt className="font-semibold">Entrega</dt>
                <dd>
                  {deliveryOptions.find((d) => d.id === open.delivery.method)?.label}
                  {open.delivery.method !== 'retirada' && <><br />{open.delivery.street}, {open.delivery.number} · {open.delivery.city}/{open.delivery.uf} · {open.delivery.cep}</>}
                </dd>
              </div>
            </dl>
            <ul className="divide-y divide-line border-y border-line text-sm">
              {open.items.map((i) => (
                <li key={i.productId + i.variantId} className="flex justify-between gap-3 py-2">
                  <span>{i.qty}× {i.name}{i.variantLabel !== 'Único' && ` (${i.variantLabel})`}{!data.products.some((p) => p.id === i.productId) && <span className="text-ink-2"> · produto removido do catálogo</span>}</span>
                  <span className="tabular-nums">{formatCents(i.priceCents * i.qty)}</span>
                </li>
              ))}
              <li className="flex justify-between py-2"><span>Entrega</span><span className="tabular-nums">{formatCents(open.shippingCents)}</span></li>
              <li className="flex justify-between py-2 font-semibold"><span>Total simulado</span><span className="tabular-nums">{formatCents(open.totalCents)}</span></li>
            </ul>
            {open.status === 'cancelado' ? (
              <Alert tone="info">Pedido cancelado. Estoque devolvido: {open.stockReturned ? 'sim (uma única vez)' : 'não'}.</Alert>
            ) : (
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label htmlFor="ord-st" className="label">Atualizar situação</label>
                  <select id="ord-st" className="field" value={open.status} onChange={(e) => (e.target.value === 'cancelado' ? setCancelId(open.id) : change(open.id, e.target.value as OrderStatus))}>
                    {(Object.keys(orderStatusLabel) as OrderStatus[]).map((s) => <option key={s} value={s}>{orderStatusLabel[s]}</option>)}
                  </select>
                </div>
                <button type="button" className="btn-ghost text-danger" onClick={() => setCancelId(open.id)}>Cancelar pedido</button>
              </div>
            )}
          </div>
        )}
      </Dialog>
      <Confirm open={!!cancelId} title="Cancelar pedido?" confirmLabel="Cancelar pedido" onClose={() => setCancelId(null)} onConfirm={() => cancelId && change(cancelId, 'cancelado')}>
        <p>Os itens voltam ao estoque uma única vez e o pagamento simulado aprovado passa a constar como estornado. Pedidos cancelados não podem ser reabertos.</p>
      </Confirm>
    </div>
  )
}

function DataTab() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'danger'; text: string } | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const doExport = () => {
    const blob = new Blob([exportData()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `arte-nossa-demo-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    setMsg({ tone: 'ok', text: 'Arquivo exportado.' })
  }
  const doImport = async (file?: File) => {
    if (!file) return
    if (file.size > 10 * 1024 * 1024) return setMsg({ tone: 'danger', text: 'Arquivo grande demais (máximo 10 MB).' })
    const error = importData(await file.text())
    setMsg(error ? { tone: 'danger', text: `Importação recusada: ${error}` } : { tone: 'ok', text: 'Dados importados com sucesso.' })
  }

  return (
    <div className="grid max-w-3xl gap-8">
      <Alert tone="info">
        <ul className="list-disc space-y-1 pl-4">
          <li>As alterações ficam neste navegador e dispositivo.</li>
          <li>Os dados não são compartilhados entre clientes e gerência em dispositivos diferentes.</li>
          <li>Limpar os dados do navegador pode apagar alterações. Exporte um backup antes.</li>
          <li>Esta gerência não tem segurança de administração real: qualquer visitante pode abri-la.</li>
          {!isPersistent() && <li><strong>O armazenamento local está indisponível agora: nada será mantido ao recarregar.</strong></li>}
        </ul>
      </Alert>
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      <div className="grid gap-3 sm:grid-cols-3">
        <button type="button" className="btn-outline" onClick={doExport}><Download aria-hidden className="size-4" /> Exportar JSON</button>
        <button type="button" className="btn-outline" onClick={() => fileRef.current?.click()}><Upload aria-hidden className="size-4" /> Importar JSON</button>
        <button type="button" className="btn-ghost text-danger" onClick={() => setConfirmReset(true)}><RotateCcw aria-hidden className="size-4" /> Restaurar dados iniciais</button>
      </div>
      <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => (doImport(e.target.files?.[0]), (e.target.value = ''))} />
      <Confirm open={confirmReset} title="Restaurar dados iniciais?" confirmLabel="Restaurar" onClose={() => setConfirmReset(false)} onConfirm={() => (resetData(), setMsg({ tone: 'ok', text: 'Dados iniciais restaurados.' }))}>
        <p>Produtos, estoque, pedidos e movimentações deste navegador voltarão ao estado original. A sacola será esvaziada. Esta ação não pode ser desfeita.</p>
      </Confirm>
    </div>
  )
}

export function Admin() {
  usePageTitle('Gerência (demonstração)')
  const [params, setParams] = useSearchParams()
  const active = tabs.find((t) => t.id === params.get('aba'))?.id ?? 'painel'
  const go = (t: string) => setParams({ aba: t }, { replace: true })
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const onKey = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!d) return
    const next = tabs[(i + d + tabs.length) % tabs.length].id
    go(next)
    tabRefs.current[next]?.focus()
  }

  return (
    <div className="container-page py-10">
      <p className="eyebrow mb-2">Área administrativa · demonstração</p>
      <h1 className="text-4xl sm:text-5xl">Gerência</h1>
      <Alert tone="info" className="mt-4">
        Todos os registros são de demonstração e ficam apenas neste navegador. Não há senha nem controle de acesso: não use para operação real.
      </Alert>
      <div role="tablist" aria-label="Seções da gerência" className="-mx-4 mt-8 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              tabRefs.current[t.id] = el
            }}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={active === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={active === t.id ? 0 : -1}
            onClick={() => go(t.id)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn('min-h-12 shrink-0 border-b-2 px-4 text-sm font-semibold', active === t.id ? 'border-ink text-ink' : 'border-transparent text-ink-2 hover:text-ink')}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${active}`} aria-labelledby={`tab-${active}`} className="pt-8">
        {active === 'painel' && <Dashboard go={go} />}
        {active === 'produtos' && <ProductsTab />}
        {active === 'estoque' && <StockTab />}
        {active === 'pedidos' && <OrdersTab />}
        {active === 'dados' && <DataTab />}
      </div>
    </div>
  )
}
