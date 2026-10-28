import * as db from './db'

const stockOf = (productId: string, variantId = 'unico') =>
  db.getSnapshot().data.products.find((p) => p.id === productId)!.variants.find((v) => v.id === variantId)!.stock

const customer = { name: 'Maria Teste', email: 'teste@exemplo.com', phone: '35900000000' }
const delivery = { method: 'lavras' as const, cep: '37200000', street: 'Rua Teste', number: '1', city: 'Lavras', uf: 'MG' }

beforeEach(() => {
  localStorage.clear()
  db.resetData()
})

describe('orders and stock', () => {
  it('places an order once, takes stock once and clears the bag', () => {
    const before = stockOf('jogo-agua-cristal')
    db.setBag([{ productId: 'jogo-agua-cristal', variantId: 'unico', qty: 2 }])
    const input = { orderId: 'AN-TEST-1', customer, delivery, paymentMethod: 'pix' as const }
    const order = db.placeOrder(input)
    expect(db.placeOrder(input)).toBe(order) // double click / resubmit is idempotent
    expect(db.getSnapshot().data.orders).toHaveLength(1)
    expect(stockOf('jogo-agua-cristal')).toBe(before - 2)
    expect(db.getSnapshot().bag).toEqual([])
    expect(order.totalCents).toBe(order.subtotalCents + 1500)
    expect(order.payment.status).toBe('pendente')
  })

  it('refuses empty bags and bags above stock', () => {
    expect(() => db.placeOrder({ orderId: 'A', customer, delivery, paymentMethod: 'pix' })).toThrow(/vazia/)
    db.setBag([{ productId: 'fruteira-murano-ambar', variantId: 'unico', qty: 5 }])
    expect(() => db.placeOrder({ orderId: 'B', customer, delivery, paymentMethod: 'pix' })).toThrow(/disponibilidade/)
  })

  it('returns stock exactly once on cancellation and keeps snapshots after product removal', () => {
    const before = stockOf('rechaud-brie')
    db.setBag([{ productId: 'rechaud-brie', variantId: 'unico', qty: 1 }])
    db.placeOrder({ orderId: 'AN-TEST-2', customer, delivery, paymentMethod: 'credito' })
    db.setPaymentStatus('AN-TEST-2', 'recusado')
    db.setPaymentStatus('AN-TEST-2', 'aprovado')
    db.setOrderStatus('AN-TEST-2', 'cancelado')
    expect(() => db.setOrderStatus('AN-TEST-2', 'cancelado')).not.toThrow()
    expect(stockOf('rechaud-brie')).toBe(before)
    const order = db.getSnapshot().data.orders[0]
    expect(order.payment).toMatchObject({ status: 'estornado', attempts: 2 })
    expect(() => db.setOrderStatus('AN-TEST-2', 'recebido')).toThrow()

    db.deleteProduct('rechaud-brie')
    expect(db.getSnapshot().data.orders[0].items[0].name).toBe('Réchaud para queijo Brie')
  })

  it('rejects negative stock adjustments and logs valid ones', () => {
    expect(() => db.adjustStock('rechaud-brie', 'unico', -1, '')).toThrow()
    db.adjustStock('rechaud-brie', 'unico', 9, 'Contagem')
    expect(stockOf('rechaud-brie')).toBe(9)
    expect(db.getSnapshot().data.movements[0]).toMatchObject({ reason: 'ajuste', note: 'Contagem' })
  })
})

describe('import / export', () => {
  it('round-trips data and rejects invalid files', () => {
    const json = db.exportData()
    expect(db.importData('not json')).toMatch(/JSON/)
    expect(db.importData('{"version":2}')).toMatch(/Versão/)
    const broken = JSON.parse(json)
    broken.products[0].variants[0].stock = -3
    expect(db.importData(JSON.stringify(broken))).toMatch(/estoque/)
    expect(db.importData(json)).toBeNull()
  })
})
