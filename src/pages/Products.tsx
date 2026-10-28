import { Search, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { usePageTitle } from '@/components/Layout'
import { PageHeader, ProductCard } from '@/components/ui'
import { categories } from '@/data/products'
import { queryCatalog, type SortKey } from '@/lib/shop'
import { useReducedMotion, useShop } from '@/lib/utils'

const sorts: { id: SortKey; label: string }[] = [
  { id: 'relevancia', label: 'Destaques primeiro' },
  { id: 'recentes', label: 'Mais recentes' },
  { id: 'menor-preco', label: 'Menor preço' },
  { id: 'maior-preco', label: 'Maior preço' },
  { id: 'nome', label: 'Nome (A–Z)' },
]

export function Products() {
  usePageTitle('Produtos')
  const { data } = useShop()
  const reduced = useReducedMotion()
  const [params, setParams] = useSearchParams()
  const text = params.get('q') ?? ''
  const category = params.get('categoria') ?? ''
  const onlyAvailable = params.get('disponiveis') === '1'
  const sort = (sorts.some((s) => s.id === params.get('ordem')) ? params.get('ordem') : 'relevancia') as SortKey

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }
  const results = useMemo(() => queryCatalog(data.products, { text, category, onlyAvailable, sort }), [data.products, text, category, onlyAvailable, sort])
  const hasFilters = Boolean(text || category || onlyAvailable)

  return (
    <>
      <PageHeader eyebrow="Catálogo" title="Produtos">
        Peças publicadas pela Arte Nossa no Instagram. Valores e estoque desta loja são fictícios (demonstração).
      </PageHeader>
      <div className="container-page py-8">
        <form role="search" className="grid gap-4 md:grid-cols-[1fr_auto]" onSubmit={(e) => e.preventDefault()}>
          <div className="relative">
            <label htmlFor="busca" className="sr-only">
              Buscar produtos
            </label>
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ink-2" />
            <input
              id="busca"
              type="search"
              value={text}
              onChange={(e) => update('q', e.target.value)}
              placeholder="Buscar por nome, material ou medida"
              className="field pl-10"
              autoComplete="off"
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={onlyAvailable} onChange={(e) => update('disponiveis', e.target.checked ? '1' : '')} className="size-5 accent-teal" />
              Só disponíveis
            </label>
            <div className="flex items-center gap-2">
              <label htmlFor="ordem" className="text-sm font-semibold">
                Ordenar
              </label>
              <select id="ordem" value={sort} onChange={(e) => update('ordem', e.target.value === 'relevancia' ? '' : e.target.value)} className="field w-auto py-1">
                {sorts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>

        <div className="mt-5" role="group" aria-label="Filtrar por categoria">
          <div className="flex flex-wrap gap-2">
            <button type="button" className="chip" aria-pressed={!category} onClick={() => update('categoria', '')}>
              Todas
            </button>
            {categories.map((c) => (
              <button key={c.id} type="button" className="chip" aria-pressed={category === c.id} onClick={() => update('categoria', category === c.id ? '' : c.id)}>
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p aria-live="polite" className="text-sm text-ink-2">
            {results.length} {results.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
          </p>
          {hasFilters && (
            <button type="button" className="btn-ghost text-sm" onClick={() => setParams({}, { replace: true })}>
              <X aria-hidden className="size-4" /> Limpar filtros
            </button>
          )}
        </div>

        <h2 className="sr-only">Resultados</h2>
        {results.length === 0 ? (
          <div className="mt-10 rounded-lg border border-dashed border-line p-10 text-center">
            <p className="font-display text-2xl">{data.products.length === 0 ? 'O catálogo está vazio.' : 'Nenhum produto encontrado.'}</p>
            <p className="mt-2 text-ink-2">
              {data.products.length === 0 ? 'Cadastre produtos na gerência ou restaure os dados iniciais.' : 'Tente outra palavra ou remova algum filtro.'}
            </p>
            {hasFilters && (
              <button type="button" className="btn-outline mt-6" onClick={() => setParams({}, { replace: true })}>
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <motion.ul layout={!reduced} className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
            <AnimatePresence>
              {results.map((p, i) => (
                <motion.li
                  key={p.id}
                  layout={!reduced}
                  initial={reduced ? false : { opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduced ? undefined : { opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.35, delay: Math.min(i, 12) * 0.04 }}
                >
                  <ProductCard product={p} priority={i < 2} />
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>
    </>
  )
}
