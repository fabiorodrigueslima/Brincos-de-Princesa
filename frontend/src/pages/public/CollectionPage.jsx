import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ProductCard } from '../../components/commerce/ProductCard.jsx'
import { PageMeta } from '../../components/common/PageMeta.jsx'
import { getCollection, getProducts } from '../../services/api.js'

export function CollectionPage() {
  const { slug } = useParams()
  const [state, setState] = useState({ loading: true, collection: null, products: [], pagination: null, error: '' })
  const [page, setPage] = useState(1)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getCollection(slug, controller.signal), getProducts({ collection: slug, sort: 'newest', page, limit: 12 }, controller.signal)])
      .then(([collection, products]) => setState({ loading: false, collection: collection.data, products: products.data, pagination: products.pagination, error: '' }))
      .catch((reason) => { if (reason.name !== 'AbortError') setState({ loading: false, collection: null, products: [], pagination: null, error: reason.code === 'COLLECTION_NOT_FOUND' ? 'not-found' : reason.message }) })
    return () => controller.abort()
  }, [page, slug])

  if (state.loading) return <div className="catalog-state product-state" aria-live="polite"><span className="loader" />Carregando coleção…</div>
  if (state.error === 'not-found') return <section className="catalog-state product-state container"><PageMeta title="Coleção não encontrada" description="A coleção solicitada não foi encontrada." /><h1>Coleção não encontrada.</h1><p>Ela pode ainda não estar publicada ou o endereço pode ter mudado.</p><Link className="button button-primary" to="/colecoes">Voltar às coleções</Link></section>
  if (state.error) return <section className="catalog-state product-state container"><PageMeta title="Coleção indisponível" description="Não foi possível carregar esta coleção." /><h1>Não foi possível abrir esta coleção.</h1><p>{state.error}</p><Link className="button button-primary" to="/colecoes">Voltar às coleções</Link></section>

  return <>
    <PageMeta title={state.collection.name} description={state.collection.description || `Conheça a coleção ${state.collection.name}.`} />
    <header className="collection-detail-hero"><div className="container narrow"><p className="eyebrow">Coleção autoral</p><h1>{state.collection.name}</h1>{state.collection.description && <p>{state.collection.description}</p>}<span>{state.pagination.total} {state.pagination.total === 1 ? 'peça' : 'peças'}</span></div>{state.collection.imageUrl && <img src={state.collection.imageUrl} alt="" />}</header>
    <section className="shop-section container">{state.products.length > 0 ? <><div className="product-grid">{state.products.map((product) => <ProductCard key={product.id} product={product} />)}</div>{state.pagination.totalPages > 1 && <nav className="pagination" aria-label="Paginação da coleção"><button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Anterior</button><span>Página {page} de {state.pagination.totalPages}</span><button type="button" disabled={page === state.pagination.totalPages} onClick={() => setPage((value) => value + 1)}>Próxima</button></nav>}</> : <div className="catalog-state"><h2>Nenhuma peça publicada nesta coleção.</h2><p>Novas peças serão apresentadas aqui em breve.</p></div>}</section>
  </>
}
