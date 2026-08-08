import { Link } from 'react-router-dom'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function money(value) {
  return currency.format(Number(value))
}

export function ProductCard({ product }) {
  return (
    <article className="product-card">
      <Link className="product-card-image" to={`/produto/${product.slug}`} aria-label={`Ver ${product.name}`}>
        {product.image
          ? <img src={product.image.url} alt={product.image.alt} loading="lazy" />
          : <div className="product-image-placeholder"><img src="/brand/brinco-de-princesa-logo.png" alt="" /><span>Imagem em preparação</span></div>}
        <div className="product-badges">{product.isNew && <span>Novo</span>}{!product.inStock && <span>Esgotado</span>}</div>
      </Link>
      <div className="product-card-body">
        {product.category && <p>{product.category.name}</p>}
        <h2><Link to={`/produto/${product.slug}`}>{product.name}</Link></h2>
        <div className="product-price">
          {product.originalPrice && <s>{money(product.originalPrice)}</s>}
          <strong>A partir de {money(product.price)}</strong>
        </div>
      </div>
    </article>
  )
}
