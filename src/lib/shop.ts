// Pure shop logic: catalog queries, bag math and order rules. All money is integer cents.
import type { BagItem, DeliveryMethod, Order, OrderItem, Product } from '@/data/types'

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const formatCents = (cents: number) => brl.format(cents / 100)

/** Parses "1.234,56", "1234.56" or "89,9" into cents. Returns null when invalid or negative. */
export function parseMoneyToCents(input: string): number | null {
  const s = input.trim().replace(/[R$\s]/g, '')
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+([.,]\d{1,2})?$/.test(s)) return null
  const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s
  const cents = Math.round(Number(normalized) * 100)
  return Number.isFinite(cents) && cents >= 0 ? cents : null
}

export const totalStock = (p: Product) => p.variants.reduce((n, v) => n + v.stock, 0)
const LOW_STOCK = 2
export const isLowStock = (stock: number) => stock > 0 && stock <= LOW_STOCK

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export type SortKey = 'relevancia' | 'menor-preco' | 'maior-preco' | 'nome' | 'recentes'

interface CatalogQuery {
  text?: string
  category?: string
  onlyAvailable?: boolean
  sort?: SortKey
}

export function queryCatalog(products: Product[], q: CatalogQuery): Product[] {
  const words = fold(q.text ?? '').split(/\s+/).filter(Boolean)
  const list = products.filter((p) => {
    if (q.category && p.category !== q.category) return false
    if (q.onlyAvailable && totalStock(p) === 0) return false
    if (!words.length) return true
    const hay = fold([p.name, p.description, ...p.details, ...p.variants.map((v) => v.label)].join(' '))
    return words.every((w) => hay.includes(w))
  })
  const by: Record<SortKey, (a: Product, b: Product) => number> = {
    relevancia: (a, b) => Number(!!b.featured) - Number(!!a.featured),
    'menor-preco': (a, b) => a.priceCents - b.priceCents,
    'maior-preco': (a, b) => b.priceCents - a.priceCents,
    nome: (a, b) => a.name.localeCompare(b.name, 'pt-BR'),
    recentes: (a, b) => (b.source?.date ?? b.createdAt).localeCompare(a.source?.date ?? a.createdAt),
  }
  return [...list].sort(by[q.sort ?? 'relevancia'])
}

export interface BagLine {
  item: BagItem
  product?: Product
  variant?: Product['variants'][number]
  lineCents: number
  /** Why the line cannot be bought as is, if anything. */
  problem?: 'removido' | 'esgotado' | 'acima-do-estoque'
}

export function resolveBag(bag: BagItem[], products: Product[]): BagLine[] {
  return bag.map((item) => {
    const product = products.find((p) => p.id === item.productId)
    const variant = product?.variants.find((v) => v.id === item.variantId)
    if (!product || !variant) return { item, lineCents: 0, problem: 'removido' }
    const problem = variant.stock === 0 ? 'esgotado' : item.qty > variant.stock ? 'acima-do-estoque' : undefined
    return { item, product, variant, lineCents: product.priceCents * item.qty, problem }
  })
}

export const bagSubtotal = (lines: BagLine[]) => lines.reduce((n, l) => n + (l.problem ? 0 : l.lineCents), 0)
export const bagCount = (bag: BagItem[]) => bag.reduce((n, i) => n + i.qty, 0)

/** Adds qty to the bag, clamped to stock. Returns the new bag and how many units were actually added. */
export function addToBag(bag: BagItem[], product: Product, variantId: string, qty: number) {
  const variant = product.variants.find((v) => v.id === variantId)
  if (!variant || !Number.isInteger(qty) || qty < 1) return { bag, added: 0 }
  const existing = bag.find((i) => i.productId === product.id && i.variantId === variantId)
  const current = existing?.qty ?? 0
  const next = Math.min(variant.stock, current + qty)
  const added = next - current
  if (added <= 0) return { bag, added: 0 }
  const updated = existing
    ? bag.map((i) => (i === existing ? { ...i, qty: next } : i))
    : [...bag, { productId: product.id, variantId, qty: next }]
  return { bag: updated, added }
}

export function setBagQty(bag: BagItem[], productId: string, variantId: string, qty: number, max: number) {
  const clamped = Math.max(1, Math.min(max, Math.floor(qty)))
  return bag.map((i) => (i.productId === productId && i.variantId === variantId ? { ...i, qty: clamped } : i))
}

export const removeFromBag = (bag: BagItem[], productId: string, variantId: string) =>
  bag.filter((i) => !(i.productId === productId && i.variantId === variantId))

// Fictitious demo shipping table.
export const deliveryOptions: { id: DeliveryMethod; label: string; cents: number; note: string }[] = [
  { id: 'retirada', label: 'Retirar na loja', cents: 0, note: 'Rua Santana, 221 – Lavras – MG' },
  { id: 'lavras', label: 'Entrega em Lavras', cents: 1500, note: 'Valor fictício de demonstração' },
  { id: 'brasil', label: 'Envio para outras cidades', cents: 3990, note: 'Valor fictício de demonstração' },
]
export const shippingCents = (m: DeliveryMethod) => deliveryOptions.find((d) => d.id === m)?.cents ?? 0

export const orderStatusLabel: Record<Order['status'], string> = {
  recebido: 'Recebido',
  preparacao: 'Em preparação',
  enviado: 'Enviado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}
export const paymentLabel: Record<Order['payment']['method'], string> = {
  pix: 'Pix (simulado)',
  credito: 'Cartão de crédito (simulado)',
  debito: 'Cartão de débito (simulado)',
}

export function snapshotItems(lines: BagLine[]): OrderItem[] {
  return lines
    .filter((l) => l.product && l.variant && !l.problem)
    .map((l) => ({
      productId: l.product!.id,
      variantId: l.variant!.id,
      name: l.product!.name,
      variantLabel: l.variant!.label,
      image: l.variant!.image ?? l.product!.images[0] ?? '',
      priceCents: l.product!.priceCents,
      qty: l.item.qty,
    }))
}

// --- Checkout form validation (demo data only) ---
export type Errors<T> = Partial<Record<keyof T, string>>

export function validateCustomer(c: { name: string; email: string; phone: string }): Errors<typeof c> {
  const e: Errors<typeof c> = {}
  if (c.name.trim().length < 3) e.name = 'Informe um nome com pelo menos 3 letras.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.email.trim())) e.email = 'Informe um e-mail válido, por exemplo teste@exemplo.com.'
  if (c.phone.replace(/\D/g, '').length < 10) e.phone = 'Informe um telefone com DDD (10 ou 11 dígitos).'
  return e
}

export function validateDelivery(d: { method: DeliveryMethod; cep: string; street: string; number: string; city: string; uf: string }) {
  const e: Errors<typeof d> = {}
  if (d.method === 'retirada') return e
  if (d.cep.replace(/\D/g, '').length !== 8) e.cep = 'O CEP precisa ter 8 dígitos.'
  if (d.street.trim().length < 3) e.street = 'Informe a rua.'
  if (!d.number.trim()) e.number = 'Informe o número (ou "s/n").'
  if (d.city.trim().length < 2) e.city = 'Informe a cidade.'
  if (!/^[A-Za-z]{2}$/.test(d.uf.trim())) e.uf = 'Use a sigla do estado com 2 letras.'
  return e
}

export const newOrderId = (now = new Date(), rand = Math.random) =>
  `AN-${now.toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(rand() * 36 ** 4)
    .toString(36)
    .toUpperCase()
    .padStart(4, '0')}`
