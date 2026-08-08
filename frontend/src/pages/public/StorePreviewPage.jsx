import { useEffect, useState } from 'react'
import { ProductCard } from '../../components/commerce/ProductCard.jsx'
import { PageHero } from '../../components/common/PageHero.jsx'
import { PageMeta } from '../../components/common/PageMeta.jsx'
import { getCategories, getProducts } from '../../services/api.js'

const initialFilters = { q: '', category: '', sort: 'newest', page: 1, limit: 12 }

export function StorePreviewPage() {
  const [filters, setFilters] = useState(initialFilters)
  const [search, setSearch] = useState('')
  const [catalog, setCatalog] = useState(null)
  const [categories, setCategories] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    getCategories(controller.signal)
      .then((response) => setCategories(response.data))
      .catch((reason) => { if (reason.name !== 'AbortError') setCategories([]) })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    getProducts(filters, controller.signal)
      .then((response) => { setCatalog(response); setError('') })
      .catch((reason) => { if (reason.name !== 'AbortError') { setCatalog(null); setError(reason.message) } })
    return () => controller.abort()
  }, [filters])

  function updateFilter(name, value) {
    setCatalog(null)
    setError('')
    setFilters((current) => ({ ...current, [name]: value, page: 1 }))
  }

  function submitSearch(event) {
    event.preventDefault()
    updateFilter('q', search.trim())
  }

  return (
    <>
      <PageMeta title="Loja" description="Descubra brincos e peças artesanais da Brinco de Princesa." />
      <PageHero eyebrow="Loja" title="Peças feitas para florescer com você." text="Explore o catálogo real por categoria. Preços e disponibilidade vêm diretamente do servidor." />
      <section className="shop-section container">
        <div className="shop-toolbar">
          <form className="shop-search" role="search" onSubmit={submitSearch}>
            <label htmlFor="store-search">Buscar na loja</label>
            <div><input id="store-search" type="search" value={search} maxLength="100" placeholder="Nome ou detalhe da peça" onChange={(event) => setSearch(event.target.value)} /><button type="submit">Buscar</button></div>
          </form>
          <label>Categoria<select value={filters.category} onChange={(event) => updateFilter('category', event.target.value)}><option value="">Todas</option>{categories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select></label>
          <label>Ordenar<select value={filters.sort} onChange={(event) => updateFilter('sort', event.target.value)}><option value="newest">Novidades</option><option value="name">Nome</option><option value="price_asc">Menor preço</option><option value="price_desc">Maior preço</option></select></label>
        </div>

        {!catalog && !error && <div className="catalog-state" aria-live="polite"><span className="loader" />Carregando peças…</div>}
        {error && <div className="catalog-state catalog-error" role="status"><h2>O catálogo está temporariamente indisponível.</h2><p>{error}</p><p>Confirme se a API e o PostgreSQL estão configurados e tente novamente.</p></div>}
        {catalog?.data.length === 0 && <div className="catalog-state"><h2>Nenhuma peça encontrada.</h2><p>Tente retirar algum filtro ou fazer uma nova busca.</p></div>}
        {catalog?.data.length > 0 && <>
          <div className="catalog-summary">{catalog.pagination.total} {catalog.pagination.total === 1 ? 'peça encontrada' : 'peças encontradas'}</div>
          <div className="product-grid">{catalog.data.map((product) => <ProductCard key={product.id} product={product} />)}</div>
          {catalog.pagination.totalPages > 1 && <nav className="pagination" aria-label="Paginação da loja"><button type="button" disabled={filters.page === 1} onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}>Anterior</button><span>Página {filters.page} de {catalog.pagination.totalPages}</span><button type="button" disabled={filters.page === catalog.pagination.totalPages} onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}>Próxima</button></nav>}
        </>}
      </section>
    </>
  )
}
