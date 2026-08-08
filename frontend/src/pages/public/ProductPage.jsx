import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageMeta } from '../../components/common/PageMeta.jsx'
import { getProduct } from '../../services/api.js'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function ProductPage() {
  const { slug } = useParams()
  const [product, setProduct] = useState(null)
  const [error, setError] = useState('')
  const [selectedVariant, setSelectedVariant] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    getProduct(slug, controller.signal)
      .then((response) => { setProduct(response.data); setSelectedVariant(response.data.variants[0] ?? null); setError('') })
      .catch((reason) => { if (reason.name !== 'AbortError') setError(reason.message) })
    return () => controller.abort()
  }, [slug])

  if (error) return <section className="catalog-state product-state container"><PageMeta title="Produto indisponível" description="Não foi possível acessar este produto." /><h1>Não foi possível abrir esta peça.</h1><p>{error}</p><Link className="button button-primary" to="/loja">Voltar à loja</Link></section>
  if (!product) return <div className="catalog-state product-state" aria-live="polite"><span className="loader" />Carregando peça…</div>

  const primaryImage = product.images.find((image) => image.primary) ?? product.images[0]
  const currentPrice = selectedVariant?.salePrice ?? selectedVariant?.price

  return (
    <>
      <PageMeta title={product.seo.title || product.name} description={product.seo.description || product.description.slice(0, 160)} />
      <article className="product-detail container">
        <div className="product-gallery">{primaryImage ? <img src={primaryImage.url} alt={primaryImage.alt} /> : <div className="product-image-placeholder"><img src="/brand/brinco-de-princesa-logo.png" alt="" /><span>Imagem em preparação</span></div>}</div>
        <div className="product-info">
          {product.category && <p className="eyebrow">{product.category.name}</p>}
          <h1>{product.name}</h1>
          {currentPrice && <p className="detail-price">{currency.format(Number(currentPrice))}</p>}
          <p className="detail-description">{product.description}</p>
          {product.variants.length > 0 && <fieldset className="variant-picker"><legend>Escolha a variação</legend>{product.variants.map((variant) => <label key={variant.id} className={selectedVariant?.id === variant.id ? 'selected' : ''}><input type="radio" name="variant" value={variant.id} checked={selectedVariant?.id === variant.id} onChange={() => setSelectedVariant(variant)} /><span>{variant.name}</span><small>{variant.inStock ? 'Disponível' : 'Esgotado'}</small></label>)}</fieldset>}
          <div className="product-facts">{product.materials && <div><strong>Materiais</strong><span>{product.materials}</span></div>}{product.dimensions && <div><strong>Medidas</strong><span>{product.dimensions}</span></div>}<div><strong>Produção</strong><span>{product.productionDays > 0 ? `Até ${product.productionDays} dias` : 'Pronta entrega quando disponível'}</span></div>{product.care && <div><strong>Cuidados</strong><span>{product.care}</span></div>}</div>
          <div className="purchase-note"><strong>Carrinho em construção</strong><p>A peça e a variação já vêm do estoque real. A compra será habilitada na próxima fase, com recálculo seguro no backend.</p></div>
        </div>
      </article>
    </>
  )
}
