// Demo data layer. Everything lives in this browser's localStorage (memory fallback when storage is
// blocked). shortcut: no server, no auth, no shared stock — a real store needs a backend (see README).
import { seedProducts } from '@/data/products'
import type {
  BagItem,
  Customer,
  DemoData,
  Delivery,
  Order,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Product,
  StockMovement,
} from '@/data/types'
import { newOrderId, resolveBag, shippingCents, snapshotItems } from './shop'

const DATA_KEY = 'arte-nossa:demo:v1'
const BAG_KEY = 'arte-nossa:bag:v1'

export const initialData = (): DemoData => ({
  version: 1,
  products: structuredClone(seedProducts),
  orders: [],
  movements: [],
})

// --- storage with graceful fallback ---
const memory = new Map<string, string>()
let persistent = true
function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    persistent = false
    return memory.get(key) ?? null
  }
}
function write(key: string, value: string): string | null {
  memory.set(key, value)
  try {
    localStorage.setItem(key, value)
    return null
  } catch (err) {
    persistent = false
    return err instanceof DOMException && err.name === 'QuotaExceededError'
      ? 'O armazenamento do navegador está cheio. Remova imagens enviadas ou exporte e restaure os dados.'
      : 'O navegador bloqueou o armazenamento local. As alterações valem só até fechar a página.'
  }
}
export const isPersistent = () => persistent

// --- validation for stored or imported data ---
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const isInt = (v: unknown, min = 0) => Number.isInteger(v) && (v as number) >= min

export function validateData(raw: unknown): { ok: true; data: DemoData } | { ok: false; error: string } {
  if (!isObj(raw)) return { ok: false, error: 'O arquivo não contém um objeto JSON.' }
  if (raw.version !== 1) return { ok: false, error: 'Versão de dados não suportada (esperado "version": 1).' }
  if (!Array.isArray(raw.products) || !Array.isArray(raw.orders) || !Array.isArray(raw.movements))
    return { ok: false, error: 'Faltam as listas "products", "orders" ou "movements".' }
  const ids = new Set<string>()
  for (const [i, p] of raw.products.entries()) {
    const where = `Produto #${i + 1}`
    if (!isObj(p) || typeof p.id !== 'string' || !p.id || typeof p.name !== 'string' || !p.name.trim())
      return { ok: false, error: `${where}: precisa de "id" e "name".` }
    if (ids.has(p.id)) return { ok: false, error: `${where}: id "${p.id}" repetido.` }
    ids.add(p.id)
    if (!isInt(p.priceCents)) return { ok: false, error: `${where}: "priceCents" deve ser inteiro ≥ 0.` }
    if (!Array.isArray(p.images) || !p.images.every((x) => typeof x === 'string'))
      return { ok: false, error: `${where}: "images" deve ser uma lista de textos.` }
    if (!Array.isArray(p.details)) return { ok: false, error: `${where}: "details" deve ser uma lista.` }
    if (!Array.isArray(p.variants) || p.variants.length === 0)
      return { ok: false, error: `${where}: precisa de ao menos uma variação.` }
    for (const v of p.variants)
      if (!isObj(v) || typeof v.id !== 'string' || typeof v.label !== 'string' || !isInt(v.stock))
        return { ok: false, error: `${where}: variação inválida (estoque deve ser inteiro ≥ 0).` }
  }
  for (const [i, o] of raw.orders.entries())
    if (!isObj(o) || typeof o.id !== 'string' || !Array.isArray(o.items) || !isInt(o.totalCents) || !isObj(o.payment))
      return { ok: false, error: `Pedido #${i + 1} inválido.` }
  for (const [i, m] of raw.movements.entries())
    if (!isObj(m) || typeof m.productId !== 'string' || !Number.isInteger(m.delta))
      return { ok: false, error: `Movimentação #${i + 1} inválida.` }
  return { ok: true, data: raw as unknown as DemoData }
}

function load(): DemoData {
  const raw = read(DATA_KEY)
  if (!raw) return initialData()
  try {
    const parsed = validateData(JSON.parse(raw))
    if (parsed.ok) return parsed.data
  } catch {
    /* fall through to seed data */
  }
  console.warn('Dados de demonstração corrompidos; restaurando dados iniciais.')
  return initialData()
}

function loadBag(): BagItem[] {
  try {
    const raw = JSON.parse(read(BAG_KEY) ?? '[]')
    return Array.isArray(raw)
      ? raw.filter((i) => isObj(i) && typeof i.productId === 'string' && typeof i.variantId === 'string' && isInt(i.qty, 1))
      : []
  } catch {
    return []
  }
}

// --- external store ---
let data = load()
let bag = loadBag()
let lastError: string | null = null
const listeners = new Set<() => void>()
let snapshot: { data: DemoData; bag: BagItem[]; lastError: string | null } = { data, bag, lastError }
const emit = () => {
  snapshot = { data, bag, lastError }
  listeners.forEach((l) => l())
}

export const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
export const getSnapshot = () => snapshot

function commit(next: DemoData) {
  data = next
  lastError = write(DATA_KEY, JSON.stringify(data))
  emit()
}
export function setBag(next: BagItem[]) {
  bag = next
  lastError = write(BAG_KEY, JSON.stringify(bag))
  emit()
}
export const clearError = () => {
  lastError = null
  emit()
}

// Keep tabs of the same browser in sync.
if (typeof window !== 'undefined')
  window.addEventListener('storage', (e) => {
    if (e.key === DATA_KEY) data = load()
    else if (e.key === BAG_KEY) bag = loadBag()
    else return
    emit()
  })

const uid = () => Math.random().toString(36).slice(2, 10)
const now = () => new Date().toISOString()

function movement(p: Product, variantId: string, delta: number, reason: StockMovement['reason'], extra: Partial<StockMovement> = {}): StockMovement {
  const v = p.variants.find((x) => x.id === variantId)
  return { id: uid(), at: now(), productId: p.id, variantId, productName: p.name, variantLabel: v?.label ?? variantId, delta, reason, ...extra }
}

// --- products & stock ---
export function saveProduct(product: Product) {
  const prev = data.products.find((p) => p.id === product.id)
  const moves: StockMovement[] = []
  for (const v of product.variants) {
    const before = prev?.variants.find((x) => x.id === v.id)?.stock ?? 0
    if (v.stock !== before) moves.push(movement(product, v.id, v.stock - before, prev ? 'ajuste' : 'cadastro', { note: prev ? 'Edição do produto' : 'Cadastro do produto' }))
  }
  const products = prev ? data.products.map((p) => (p.id === product.id ? product : p)) : [product, ...data.products]
  commit({ ...data, products, movements: [...moves, ...data.movements] })
}

export function deleteProduct(id: string) {
  // Orders keep their own item snapshots, so removing a product never changes past orders.
  commit({ ...data, products: data.products.filter((p) => p.id !== id) })
  setBag(bag.filter((i) => i.productId !== id))
}

export function adjustStock(productId: string, variantId: string, newStock: number, note: string) {
  if (!Number.isInteger(newStock) || newStock < 0) throw new Error('Estoque deve ser um número inteiro maior ou igual a zero.')
  const p = data.products.find((x) => x.id === productId)
  const v = p?.variants.find((x) => x.id === variantId)
  if (!p || !v) throw new Error('Produto ou variação não encontrado.')
  if (v.stock === newStock) return
  const updated = { ...p, variants: p.variants.map((x) => (x.id === variantId ? { ...x, stock: newStock } : x)) }
  commit({
    ...data,
    products: data.products.map((x) => (x.id === productId ? updated : x)),
    movements: [movement(p, variantId, newStock - v.stock, 'ajuste', { note: note.trim() || undefined }), ...data.movements],
  })
}

// --- orders ---
export interface PlaceOrderInput {
  orderId: string
  customer: Customer
  delivery: Delivery
  paymentMethod: PaymentMethod
}

/** Creates the order, takes stock exactly once and clears the bag. Idempotent per orderId. */
export function placeOrder(input: PlaceOrderInput): Order {
  const existing = data.orders.find((o) => o.id === input.orderId)
  if (existing) return existing
  const lines = resolveBag(bag, data.products)
  if (!lines.length) throw new Error('A sacola está vazia.')
  const bad = lines.find((l) => l.problem)
  if (bad) throw new Error('Alguns itens da sacola mudaram de disponibilidade. Revise a sacola antes de finalizar.')
  const items = snapshotItems(lines)
  const subtotalCents = items.reduce((n, i) => n + i.priceCents * i.qty, 0)
  const ship = shippingCents(input.delivery.method)
  const order: Order = {
    id: input.orderId,
    createdAt: now(),
    items,
    customer: input.customer,
    delivery: input.delivery,
    payment: { method: input.paymentMethod, status: 'pendente', attempts: 0 },
    status: 'recebido',
    subtotalCents,
    shippingCents: ship,
    totalCents: subtotalCents + ship,
    stockReturned: false,
  }
  const products = data.products.map((p) => {
    const taken = items.filter((i) => i.productId === p.id)
    if (!taken.length) return p
    return { ...p, variants: p.variants.map((v) => ({ ...v, stock: v.stock - (taken.find((t) => t.variantId === v.id)?.qty ?? 0) })) }
  })
  const moves = items.map((i) => movement(data.products.find((p) => p.id === i.productId)!, i.variantId, -i.qty, 'venda', { orderId: order.id }))
  commit({ ...data, products, orders: [order, ...data.orders], movements: [...moves, ...data.movements] })
  setBag([])
  return order
}

export function setPaymentStatus(orderId: string, status: PaymentStatus, method?: PaymentMethod) {
  commit({
    ...data,
    orders: data.orders.map((o) =>
      o.id === orderId
        ? { ...o, payment: { method: method ?? o.payment.method, status, attempts: o.payment.attempts + (status === 'pendente' ? 0 : 1) } }
        : o,
    ),
  })
}

/** Changes order status. Cancelling returns the stock once; repeated cancels never return it again. */
export function setOrderStatus(orderId: string, status: OrderStatus) {
  const order = data.orders.find((o) => o.id === orderId)
  if (!order || order.status === status) return
  if (order.status === 'cancelado') throw new Error('Pedidos cancelados não podem ser reabertos na demonstração.')
  let products = data.products
  let movements = data.movements
  let stockReturned = order.stockReturned
  let payment = order.payment
  if (status === 'cancelado' && !order.stockReturned) {
    for (const it of order.items) {
      const p = products.find((x) => x.id === it.productId)
      // Product or variant removed meanwhile: nothing to return it to, the order snapshot is kept anyway.
      if (!p?.variants.some((v) => v.id === it.variantId)) continue
      products = products.map((x) =>
        x.id === p.id ? { ...x, variants: x.variants.map((v) => (v.id === it.variantId ? { ...v, stock: v.stock + it.qty } : v)) } : x,
      )
      movements = [movement(p, it.variantId, it.qty, 'cancelamento', { orderId }), ...movements]
    }
    stockReturned = true
    if (payment.status === 'aprovado') payment = { ...payment, status: 'estornado' }
  }
  commit({ ...data, products, movements, orders: data.orders.map((o) => (o.id === orderId ? { ...o, status, stockReturned, payment } : o)) })
}

// --- import / export / reset ---
export const exportData = () => JSON.stringify(data, null, 2)

export function importData(json: string): string | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return 'O arquivo não é um JSON válido.'
  }
  const res = validateData(parsed)
  if (!res.ok) return res.error
  commit(res.data)
  setBag([])
  return null
}

export function resetData() {
  commit(initialData())
  setBag([])
}

export { newOrderId }
