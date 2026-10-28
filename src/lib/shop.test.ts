import { seedProducts } from '@/data/products'
import type { Product } from '@/data/types'
import { addToBag, bagSubtotal, parseMoneyToCents, queryCatalog, removeFromBag, resolveBag, setBagQty, validateCustomer, validateDelivery } from './shop'

const vasos = seedProducts.find((p) => p.id === 'vasos-ceramica-canelada')!
const esgotado = seedProducts.find((p) => p.id === 'deusas-da-justica')!

describe('catalog search and filters', () => {
  it('finds products ignoring accents and case', () => {
    expect(queryCatalog(seedProducts, { text: 'RECHAUD' }).map((p) => p.id)).toEqual(expect.arrayContaining(['rechaud-petiscos', 'rechaud-brie']))
    expect(queryCatalog(seedProducts, { text: 'ceramica 53' }).map((p) => p.id)).toEqual(['vasos-ceramica-canelada'])
  })
  it('filters by category and availability', () => {
    const mesa = queryCatalog(seedProducts, { category: 'mesa' })
    expect(mesa.length).toBeGreaterThan(0)
    expect(mesa.every((p) => p.category === 'mesa')).toBe(true)
    expect(queryCatalog(seedProducts, { onlyAvailable: true }).some((p) => p.id === esgotado.id)).toBe(false)
  })
  it('returns empty list for no match and sorts by price', () => {
    expect(queryCatalog(seedProducts, { text: 'xyz-inexistente' })).toEqual([])
    const sorted = queryCatalog(seedProducts, { sort: 'menor-preco' })
    expect(sorted[0].priceCents).toBeLessThanOrEqual(sorted[sorted.length - 1].priceCents)
  })
})

describe('bag', () => {
  it('adds, clamps to stock and merges repeated adds', () => {
    let { bag, added } = addToBag([], vasos, '53cm', 1)
    expect(added).toBe(1)
    ;({ bag, added } = addToBag(bag, vasos, '53cm', 5))
    expect(added).toBe(1) // stock is 2
    expect(bag).toEqual([{ productId: vasos.id, variantId: '53cm', qty: 2 }])
  })
  it('rejects invalid quantities and out-of-stock variants', () => {
    expect(addToBag([], vasos, '53cm', 0).added).toBe(0)
    expect(addToBag([], vasos, '53cm', -2).added).toBe(0)
    expect(addToBag([], esgotado, 'unico', 1).added).toBe(0)
  })
  it('updates quantity within limits, removes items and sums in cents', () => {
    const { bag } = addToBag([], vasos, '40cm', 1)
    expect(setBagQty(bag, vasos.id, '40cm', 99, 3)[0].qty).toBe(3)
    expect(setBagQty(bag, vasos.id, '40cm', -5, 3)[0].qty).toBe(1)
    const lines = resolveBag(setBagQty(bag, vasos.id, '40cm', 2, 3), seedProducts)
    expect(bagSubtotal(lines)).toBe(vasos.priceCents * 2)
    expect(removeFromBag(bag, vasos.id, '40cm')).toEqual([])
  })
  it('flags removed products and stock problems', () => {
    const bag = [{ productId: 'nao-existe', variantId: 'x', qty: 1 }, { productId: vasos.id, variantId: '53cm', qty: 9 }]
    const [removed, over] = resolveBag(bag, seedProducts)
    expect(removed.problem).toBe('removido')
    expect(over.problem).toBe('acima-do-estoque')
    expect(bagSubtotal([removed, over])).toBe(0)
  })
})

describe('money and validation', () => {
  it('parses Brazilian money into cents', () => {
    expect(parseMoneyToCents('129,90')).toBe(12990)
    expect(parseMoneyToCents('1.299,90')).toBe(129990)
    expect(parseMoneyToCents('0,1')).toBe(10)
    expect(parseMoneyToCents('-5')).toBeNull()
    expect(parseMoneyToCents('abc')).toBeNull()
  })
  it('validates checkout fields', () => {
    expect(validateCustomer({ name: 'Ma', email: 'x', phone: '12' })).toHaveProperty('email')
    expect(validateCustomer({ name: 'Maria Teste', email: 'teste@exemplo.com', phone: '35900000000' })).toEqual({})
    expect(validateDelivery({ method: 'retirada', cep: '', street: '', number: '', city: '', uf: '' })).toEqual({})
    expect(Object.keys(validateDelivery({ method: 'brasil', cep: '1', street: '', number: '', city: '', uf: 'M' }))).toHaveLength(5)
  })
})

it('seed data is consistent', () => {
  const ids = new Set<string>()
  for (const p of seedProducts as Product[]) {
    expect(ids.has(p.id)).toBe(false)
    ids.add(p.id)
    expect(p.images.length).toBeGreaterThan(0)
    expect(p.variants.every((v) => Number.isInteger(v.stock) && v.stock >= 0)).toBe(true)
  }
})
