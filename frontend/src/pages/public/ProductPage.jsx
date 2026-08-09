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
  const [selectedImageId, setSelectedImageId] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    getProduct(slug, controller.signal)
      .then((response) => {
        const firstAvailable = response.data.variants.find((variant) => variant.inStock)
        const primaryImage = response.data.images.find((image) => image.primary) ?? response.data.images[0]
        setProduct(response.data)
        setSelectedVariant(firstAvailable ?? response.data.variants[0] ?? null)
        setSelectedImageId(primaryImage?.id ?? null)
        setError('')
      })
      .catch((reason) => { if (reason.name !== 'AbortError') setError(reason.message) })
    return () => controller.abort()
  }, [slug])

  if (error) return <section className="catalog-state product-state container"><PageMeta title="Produto indisponível" description="Não foi possível acessar este produto." /><h1>Não foi possível abrir esta peça.</h1><p>{error}</p><Link className="button button-primary" to="/loja">Voltar à loja</Link></section>
  if (!product) return <div className="catalog-state product-state" aria-live="polite"><span className="loader" />Carregando peça…</div>

  const primaryImage = product.images.find((image) => image.id === selectedImageId)
    ?? product.images.find((image) => image.primary)
    ?? product.images[0]
  const currentPrice = selectedVariant?.salePrice ?? selectedVariant?.price
  const isDevelopmentData = product.slug.endsWith('-demo')

  return (
    <>
      <PageMeta title={product.seo.title || product.name} description={product.seo.description || product.description.slice(0, 160)} />
      <article className="product-detail container">
        <div className="product-gallery">
          <div className="product-gallery-main">{primaryImage ? <img src={primaryImage.url} alt={primaryImage.alt} /> : <div className="product-image-placeholder"><img src="/brand/brinco-de-princesa-logo.png" alt="" /><span>Imagem em preparação</span></div>}</div>
          {product.images.length > 1 && <div className="product-thumbnails" aria-label="Galeria do produto">{product.images.map((image, index) => <button key={image.id} type="button" className={primaryImage?.id === image.id ? 'selected' : ''} aria-label={`Ver imagem ${index + 1} de ${product.name}`} aria-pressed={primaryImage?.id === image.id} onClick={() => setSelectedImageId(image.id)}><img src={image.url} alt="" /></button>)}</div>}
        </div>
        <div className="product-info">
          {isDevelopmentData && <p className="development-label">Dados de desenvolvimento — não é uma oferta comercial</p>}
          {product.category && <p className="eyebrow">{product.category.name}</p>}
          <h1>{product.name}</h1>
          {currentPrice && <p className="detail-price">{currency.format(Number(currentPrice))}</p>}
          <p className="detail-description">{product.description}</p>
          {product.variants.length > 0 && <fieldset className="variant-picker"><legend>Escolha a variação</legend>{product.variants.map((variant) => <button key={variant.id} type="button" className={selectedVariant?.id === variant.id ? 'selected' : ''} aria-pressed={selectedVariant?.id === variant.id} onClick={() => setSelectedVariant(variant)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedVariant(variant) } }}><span>{variant.name}</span><small>{variant.inStock ? `${variant.availableStock} ${variant.availableStock === 1 ? 'unidade disponível' : 'unidades disponíveis'}` : 'Esgotado'}</small></button>)}</fieldset>}
          {selectedVariant && <p className={`stock-status ${selectedVariant.inStock ? 'in-stock' : 'out-of-stock'}`} role="status">{selectedVariant.inStock ? 'Disponível para demonstração' : 'Indisponível no momento'}</p>}
          <div className="product-facts">{product.materials && <div><strong>Materiais</strong><span>{product.materials}</span></div>}{product.dimensions && <div><strong>Medidas</strong><span>{product.dimensions}</span></div>}<div><strong>Produção</strong><span>{product.productionDays > 0 ? `Até ${product.productionDays} dias` : 'Pronta entrega quando disponível'}</span></div>{product.care && <div><strong>Cuidados</strong><span>{product.care}</span></div>}</div>
          {product.collections.length > 0 && <div className="product-collections"><strong>Coleção</strong>{product.collections.map((collection) => <span key={collection.slug}>{collection.name}</span>)}</div>}
          <div className="purchase-note"><strong>Compra ainda não disponível</strong><p>A peça e a variação já vêm do estoque real. Carrinho e checkout pertencem a uma fase futura.</p><button type="button" disabled aria-disabled="true">Comprar em fase futura</button></div>
        </div>
      </article>
    </>
  )
}
