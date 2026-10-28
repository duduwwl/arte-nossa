export type CategoryId = 'decoracao' | 'vasos' | 'mesa' | 'servir' | 'banho' | 'sacra' | 'presentes'

export interface Variant {
  id: string
  label: string
  stock: number
  /** Image key that shows this option, when the photos differ per option. */
  image?: string
}

export interface Product {
  id: string
  name: string
  category: CategoryId
  description: string
  /** Facts stated by the store (materials, sizes, contents). Never inferred. */
  details: string[]
  /** Image keys from public/img (without size suffix) or data URLs added in the admin. */
  images: string[]
  /** Fictitious demo price in cents. */
  priceCents: number
  variants: Variant[]
  /** Instagram post the product information came from. */
  source?: { url: string; date: string }
  /** Price the store published on Instagram, kept as historical reference only. */
  publishedPrice?: string
  featured?: boolean
  createdAt: string
}

export interface BagItem {
  productId: string
  variantId: string
  qty: number
}

export type PaymentMethod = 'pix' | 'credito' | 'debito'
export type PaymentStatus = 'pendente' | 'aprovado' | 'recusado' | 'estornado'
export type OrderStatus = 'recebido' | 'preparacao' | 'enviado' | 'concluido' | 'cancelado'
export type DeliveryMethod = 'retirada' | 'lavras' | 'brasil'

/** Snapshot of the product at purchase time, so later edits or removals never change past orders. */
export interface OrderItem {
  productId: string
  variantId: string
  name: string
  variantLabel: string
  image: string
  priceCents: number
  qty: number
}

export interface Customer {
  name: string
  email: string
  phone: string
}

export interface Delivery {
  method: DeliveryMethod
  cep: string
  street: string
  number: string
  city: string
  uf: string
}

export interface Order {
  id: string
  createdAt: string
  items: OrderItem[]
  customer: Customer
  delivery: Delivery
  payment: { method: PaymentMethod; status: PaymentStatus; attempts: number }
  status: OrderStatus
  subtotalCents: number
  shippingCents: number
  totalCents: number
  /** True once a cancellation has put the items back in stock (prevents double returns). */
  stockReturned: boolean
}

export interface StockMovement {
  id: string
  at: string
  productId: string
  variantId: string
  productName: string
  variantLabel: string
  delta: number
  reason: 'ajuste' | 'venda' | 'cancelamento' | 'cadastro'
  note?: string
  orderId?: string
}

export interface DemoData {
  version: 1
  products: Product[]
  orders: Order[]
  movements: StockMovement[]
}
