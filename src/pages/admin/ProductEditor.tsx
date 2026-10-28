import { ImagePlus, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Img } from '@/components/Img'
import { Alert, ProductCard } from '@/components/ui'
import sizes from '@/data/image-sizes.json'
import { categories } from '@/data/products'
import type { CategoryId, Product } from '@/data/types'
import { formatCents, parseMoneyToCents } from '@/lib/shop'
import { cn } from '@/lib/utils'

const library = Object.keys(sizes).filter((k) => k !== 'logo')
const MAX_UPLOAD = 4 * 1024 * 1024

/** Downscales an uploaded photo to max 1280px WebP so it fits in browser storage. */
async function fileToDataUrl(file: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp|gif|avif)$/.test(file.type)) throw new Error('Envie uma imagem JPG, PNG, WebP, GIF ou AVIF.')
  if (file.size > MAX_UPLOAD) throw new Error('A imagem deve ter no máximo 4 MB.')
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('Não foi possível ler esta imagem.')
  })
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/webp', 0.8)
}

const slug = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)

interface Form {
  name: string
  category: CategoryId
  description: string
  details: string
  price: string
  images: string[]
  variants: { id: string; label: string; stock: string }[]
  featured: boolean
}

const toForm = (p?: Product): Form => ({
  name: p?.name ?? '',
  category: p?.category ?? 'decoracao',
  description: p?.description ?? '',
  details: p?.details.join('\n') ?? '',
  price: p ? (p.priceCents / 100).toFixed(2).replace('.', ',') : '',
  images: p?.images ?? [],
  variants: p?.variants.map((v) => ({ id: v.id, label: v.label, stock: String(v.stock) })) ?? [{ id: 'unico', label: 'Único', stock: '0' }],
  featured: p?.featured ?? false,
})

export function ProductEditor({ product, existingIds, onSave, onCancel }: { product?: Product; existingIds: string[]; onSave: (p: Product) => void; onCancel: () => void }) {
  const [f, setF] = useState<Form>(() => toForm(product))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [uploadError, setUploadError] = useState('')
  const [showLibrary, setShowLibrary] = useState(false)
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }))

  const build = (): Product | null => {
    const e: Record<string, string> = {}
    if (f.name.trim().length < 3) e.name = 'O nome precisa ter ao menos 3 caracteres.'
    if (f.description.trim().length < 10) e.description = 'Descreva o produto com ao menos 10 caracteres.'
    const cents = parseMoneyToCents(f.price)
    if (cents === null || cents === 0) e.price = 'Informe um preço válido maior que zero, por exemplo 129,90.'
    if (!f.images.length) e.images = 'Adicione ao menos uma imagem.'
    const labels = new Set<string>()
    f.variants.forEach((v, i) => {
      if (!v.label.trim()) e[`v${i}`] = 'Informe o nome da opção.'
      else if (labels.has(v.label.trim().toLowerCase())) e[`v${i}`] = 'Opção repetida.'
      labels.add(v.label.trim().toLowerCase())
      if (!/^\d+$/.test(v.stock.trim())) e[`s${i}`] = 'Estoque deve ser um número inteiro ≥ 0.'
    })
    setErrors(e)
    if (Object.keys(e).length) return null
    let id = product?.id ?? (slug(f.name) || 'produto')
    if (!product) for (let n = 2; existingIds.includes(id); n++) id = `${slug(f.name)}-${n}`
    return {
      id,
      name: f.name.trim(),
      category: f.category,
      description: f.description.trim(),
      details: f.details.split('\n').map((d) => d.trim()).filter(Boolean),
      images: f.images,
      priceCents: cents!,
      variants: f.variants.map((v, i) => {
        // Keep an option's photo only while that photo is still among the product images.
        const image = product?.variants.find((x) => x.id === v.id)?.image
        return { id: v.id || `${slug(v.label) || 'opcao'}-${i}`, label: v.label.trim(), stock: Number(v.stock), ...(image && f.images.includes(image) ? { image } : {}) }
      }),
      featured: f.featured,
      source: product?.source,
      publishedPrice: product?.publishedPrice,
      createdAt: product?.createdAt ?? new Date().toISOString(),
    }
  }

  const previewCents = parseMoneyToCents(f.price) ?? 0
  const preview: Product = {
    id: product?.id ?? 'preview',
    name: f.name || 'Nome do produto',
    category: f.category,
    description: f.description,
    details: [],
    images: f.images,
    priceCents: previewCents,
    variants: f.variants.map((v, i) => ({ id: String(i), label: v.label, stock: Number(v.stock) || 0 })),
    createdAt: '',
  }

  const upload = async (files: FileList | null) => {
    setUploadError('')
    if (!files?.length) return
    try {
      const urls = await Promise.all([...files].map(fileToDataUrl))
      set('images', [...f.images, ...urls])
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Falha ao enviar imagem.')
    }
  }

  const err = (k: string) => errors[k] && <p className="error-text">{errors[k]}</p>

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        const p = build()
        if (p) onSave(p)
        else requestAnimationFrame(() => (document.querySelector('[aria-invalid="true"]') as HTMLElement | null)?.focus())
      }}
      className="grid gap-8 lg:grid-cols-[1fr_16rem]"
    >
      <div className="grid gap-5">
        <div>
          <label className="label" htmlFor="p-name">Nome</label>
          <input id="p-name" className="field" value={f.name} onChange={(e) => set('name', e.target.value)} aria-invalid={!!errors.name} />
          {err('name')}
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="p-cat">Categoria</label>
            <select id="p-cat" className="field" value={f.category} onChange={(e) => set('category', e.target.value as CategoryId)}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="p-price">Preço demonstrativo (R$)</label>
            <input id="p-price" inputMode="decimal" className="field" value={f.price} onChange={(e) => set('price', e.target.value)} placeholder="129,90" aria-invalid={!!errors.price} />
            {err('price')}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="p-desc">Descrição</label>
          <textarea id="p-desc" rows={4} className="field" value={f.description} onChange={(e) => set('description', e.target.value)} aria-invalid={!!errors.description} />
          {err('description')}
        </div>
        <div>
          <label className="label" htmlFor="p-det">Materiais e medidas (um por linha)</label>
          <textarea id="p-det" rows={3} className="field" value={f.details} onChange={(e) => set('details', e.target.value)} placeholder={'Cristal\n30 cm de altura'} />
        </div>
        <label className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold">
          <input type="checkbox" className="size-5 accent-teal" checked={f.featured} onChange={(e) => set('featured', e.target.checked)} /> Mostrar nos destaques da página inicial
        </label>

        <fieldset>
          <legend className="label">Imagens</legend>
          {f.images.length > 0 && (
            <ul className="mb-3 flex flex-wrap gap-2">
              {f.images.map((src, i) => (
                <li key={src.slice(0, 80) + i} className="relative">
                  <Img src={src} alt={`Imagem ${i + 1}`} className="size-20 rounded-md border border-line" sizesAttr="80px" />
                  <button type="button" className="absolute -top-2 -right-2 grid size-8 place-items-center rounded-full bg-danger text-white" aria-label={`Remover imagem ${i + 1}`} onClick={() => set('images', f.images.filter((_, n) => n !== i))}>
                    <Trash2 aria-hidden className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            <label className="btn-outline cursor-pointer has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-teal">
              <ImagePlus aria-hidden className="size-4" /> Enviar imagem
              <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => (upload(e.target.files), (e.target.value = ''))} />
            </label>
            <button type="button" className="btn-outline" aria-expanded={showLibrary} onClick={() => setShowLibrary((s) => !s)}>
              Escolher da biblioteca
            </button>
          </div>
          {uploadError && <Alert className="mt-3">{uploadError}</Alert>}
          {err('images')}
          {showLibrary && (
            <ul className="mt-3 grid max-h-64 grid-cols-4 gap-2 overflow-y-auto rounded-md border border-line p-2 sm:grid-cols-6">
              {library.map((k) => {
                const on = f.images.includes(k)
                return (
                  <li key={k}>
                    <button type="button" aria-pressed={on} aria-label={k} onClick={() => set('images', on ? f.images.filter((x) => x !== k) : [...f.images, k])} className={cn('block w-full overflow-hidden rounded border-2', on ? 'border-teal' : 'border-transparent')}>
                      <Img src={k} alt="" className="aspect-square w-full" sizesAttr="80px" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          <p className="mt-2 text-xs text-ink-2">Imagens enviadas ficam salvas só neste navegador (reduzidas para até 1280 px).</p>
        </fieldset>

        <fieldset>
          <legend className="label">Opções e estoque</legend>
          <ul className="grid gap-3">
            {f.variants.map((v, i) => (
              <li key={i} className="grid grid-cols-[1fr_6rem_auto] items-start gap-2">
                <div>
                  <label className="sr-only" htmlFor={`v-l-${i}`}>Nome da opção {i + 1}</label>
                  <input id={`v-l-${i}`} className="field" value={v.label} placeholder="Ex.: 30 cm" aria-invalid={!!errors[`v${i}`]} onChange={(e) => set('variants', f.variants.map((x, n) => (n === i ? { ...x, label: e.target.value } : x)))} />
                  {err(`v${i}`)}
                </div>
                <div>
                  <label className="sr-only" htmlFor={`v-s-${i}`}>Estoque da opção {i + 1}</label>
                  <input id={`v-s-${i}`} inputMode="numeric" className="field" value={v.stock} aria-invalid={!!errors[`s${i}`]} onChange={(e) => set('variants', f.variants.map((x, n) => (n === i ? { ...x, stock: e.target.value } : x)))} />
                  {err(`s${i}`)}
                </div>
                <button type="button" className="btn-ghost size-11 p-0 text-danger" disabled={f.variants.length === 1} aria-label={`Remover opção ${i + 1}`} onClick={() => set('variants', f.variants.filter((_, n) => n !== i))}>
                  <Trash2 aria-hidden className="size-4" />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="btn-ghost mt-2" onClick={() => set('variants', [...f.variants, { id: '', label: '', stock: '0' }])}>
            <Plus aria-hidden className="size-4" /> Adicionar opção
          </button>
        </fieldset>

        {Object.keys(errors).length > 0 && <Alert>Revise os campos destacados antes de salvar.</Alert>}
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-outline" onClick={onCancel}>Cancelar</button>
          <button className="btn-primary">{product ? 'Salvar alterações' : 'Cadastrar produto'}</button>
        </div>
      </div>

      <aside aria-label="Pré-visualização" className="h-fit lg:sticky lg:top-0">
        <p className="label">Pré-visualização</p>
        <div className="pointer-events-none" inert>
          <ProductCard product={preview} />
        </div>
        <p className="mt-2 text-xs text-ink-2">Preço: {formatCents(previewCents)}. Nada é salvo até você confirmar.</p>
      </aside>
    </form>
  )
}
