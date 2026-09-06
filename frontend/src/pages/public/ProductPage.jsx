import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageMeta } from "../../components/common/PageMeta.jsx";
import { getProduct } from "../../services/api.js";
import { useCart } from "../../context/cartContextValue.js";
import {
  categoryPath,
  currency,
  effectivePrice,
  hasValidSale,
  productFacts,
} from "./productViewModel.js";

function ImageDialog({ image, productName, onClose }) {
  const closeButton = useRef(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    closeButton.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        event.preventDefault();
        closeButton.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  return (
    <div
      className="image-dialog"
      role="dialog"
      aria-modal="true"
      aria-label={`Imagem ampliada de ${productName}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <button
        ref={closeButton}
        type="button"
        aria-label="Fechar imagem ampliada"
        onClick={onClose}
      >
        Fechar ×
      </button>
      <img src={image.url} alt={image.alt || productName} />
    </div>
  );
}

export function ProductPage() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedImageId, setSelectedImageId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [cartMessage, setCartMessage] = useState("");
  const [expandedImage, setExpandedImage] = useState(false);
  const { addItem } = useCart();

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProduct(null);
    setError(null);
    getProduct(slug, controller.signal)
      .then((response) => {
        const firstAvailable = response.data.variants.find(
          (variant) => variant.inStock,
        );
        const primaryImage =
          response.data.images.find((image) => image.primary) ??
          response.data.images[0];
        setProduct(response.data);
        setSelectedVariant(firstAvailable ?? response.data.variants[0] ?? null);
        setSelectedImageId(primaryImage?.id ?? null);
      })
      .catch((reason) => {
        if (reason.name !== "AbortError")
          setError({
            message: reason.message,
            notFound: reason.status === 404,
          });
      });
    return () => controller.abort();
  }, [slug]);

  if (error)
    return (
      <section className="catalog-state product-state container">
        <PageMeta
          title={
            error.notFound ? "Produto não encontrado" : "Produto indisponível"
          }
          description="Não foi possível acessar este produto."
        />
        <h1>
          {error.notFound
            ? "Esta peça não foi encontrada."
            : "Não foi possível abrir esta peça."}
        </h1>
        <p>
          {error.notFound
            ? "Ela pode ter saído do catálogo ou o endereço pode estar incorreto."
            : error.message}
        </p>
        <Link className="button button-primary" to="/loja">
          Voltar à loja
        </Link>
      </section>
    );
  if (!product)
    return (
      <div
        className="catalog-state product-state"
        role="status"
        aria-live="polite"
      >
        <span className="loader" aria-hidden="true" />
        Carregando peça…
      </div>
    );

  const primaryImage =
    product.images.find((image) => image.id === selectedImageId) ??
    product.images.find((image) => image.primary) ??
    product.images[0];
  const facts = productFacts(product, selectedVariant);
  const price = effectivePrice(selectedVariant);
  const categoryUrl = categoryPath(product.category);

  const selectVariant = (variant) => {
    setSelectedVariant(variant);
    setQuantity(1);
    setCartMessage("");
  };

  return (
    <>
      <PageMeta
        title={product.seo.title || product.name}
        description={
          product.seo.description || product.description.slice(0, 160)
        }
        image={primaryImage?.url}
        type="product"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description: product.description,
          image: product.images.map((item) => item.url),
          sku: selectedVariant?.sku,
          offers: selectedVariant
            ? {
                "@type": "Offer",
                priceCurrency: "BRL",
                price: String(price),
                availability: selectedVariant.inStock
                  ? "https://schema.org/InStock"
                  : "https://schema.org/OutOfStock",
                url: window.location.href,
              }
            : undefined,
        }}
      />
      <nav
        className="product-breadcrumb container"
        aria-label="Navegação estrutural"
      >
        <Link to="/">Início</Link>
        <span aria-hidden="true">/</span>
        {product.category && (
          <>
            <Link to={categoryUrl}>{product.category.name}</Link>
            <span aria-hidden="true">/</span>
          </>
        )}
        <span aria-current="page">{product.name}</span>
      </nav>
      <article className="product-detail container">
        <div className="product-gallery">
          <div className="product-gallery-main">
            {primaryImage ? (
              <button
                type="button"
                aria-label={`Ampliar imagem de ${product.name}`}
                onClick={() => setExpandedImage(true)}
              >
                <img
                  src={primaryImage.url}
                  alt={primaryImage.alt || product.name}
                  width={primaryImage.width || undefined}
                  height={primaryImage.height || undefined}
                />
              </button>
            ) : (
              <div className="product-image-placeholder">
                <img src="/brand/brinco-de-princesa-logo.png" alt="" />
                <span>Imagem em preparação</span>
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="product-thumbnails" aria-label="Galeria do produto">
              {product.images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  className={primaryImage?.id === image.id ? "selected" : ""}
                  aria-label={`Ver imagem ${index + 1} de ${product.images.length}`}
                  aria-pressed={primaryImage?.id === image.id}
                  onClick={() => setSelectedImageId(image.id)}
                >
                  <img
                    src={image.url}
                    alt=""
                    loading="lazy"
                    width={image.width || undefined}
                    height={image.height || undefined}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="product-info">
          {product.slug.endsWith("-demo") && (
            <p className="development-label">
              Dados de desenvolvimento — não é uma oferta comercial
            </p>
          )}
          {product.category && (
            <p className="eyebrow">
              <Link to={categoryUrl}>{product.category.name}</Link>
            </p>
          )}
          <h1>{product.name}</h1>
          {price != null && (
            <p className="detail-price" aria-live="polite">
              {hasValidSale(selectedVariant) && (
                <s>{currency.format(Number(selectedVariant.price))}</s>
              )}
              <strong>{currency.format(price)}</strong>
            </p>
          )}
          {product.collections.length > 0 && (
            <div className="product-collections">
              <strong>
                {product.collections.length === 1 ? "Coleção" : "Coleções"}
              </strong>
              {product.collections.map((collection) => (
                <Link key={collection.slug} to={`/colecoes/${collection.slug}`}>
                  {collection.name}
                </Link>
              ))}
            </div>
          )}
          {product.variants.length > 0 && (
            <fieldset className="variant-picker">
              <legend>Escolha a variação</legend>
              {product.variants.map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  className={`${selectedVariant?.id === variant.id ? "selected " : ""}${variant.inStock ? "" : "unavailable"}`}
                  aria-pressed={selectedVariant?.id === variant.id}
                  onClick={() => selectVariant(variant)}
                >
                  <span>{variant.name}</span>
                  <small>
                    {variant.inStock
                      ? `${variant.availableStock} ${variant.availableStock === 1 ? "unidade disponível" : "unidades disponíveis"}`
                      : "Indisponível"}
                  </small>
                </button>
              ))}
            </fieldset>
          )}
          {selectedVariant && (
            <p
              className={`stock-status ${selectedVariant.inStock ? "in-stock" : "out-of-stock"}`}
              role="status"
            >
              {selectedVariant.inStock
                ? "Disponível"
                : "Indisponível no momento"}
            </p>
          )}
          <div className="add-to-cart">
            <div
              className="quantity-control"
              aria-label="Quantidade a adicionar"
            >
              <button
                type="button"
                aria-label="Diminuir quantidade"
                disabled={quantity <= 1}
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              >
                −
              </button>
              <span aria-live="polite">{quantity}</span>
              <button
                type="button"
                aria-label="Aumentar quantidade"
                disabled={
                  !selectedVariant?.inStock ||
                  quantity >= Math.min(99, selectedVariant.availableStock)
                }
                onClick={() =>
                  setQuantity((value) =>
                    Math.min(99, selectedVariant.availableStock, value + 1),
                  )
                }
              >
                +
              </button>
            </div>
            <button
              className="button button-primary"
              type="button"
              disabled={!selectedVariant?.inStock}
              onClick={() => {
                addItem(selectedVariant.id, quantity);
                setCartMessage(
                  `${quantity} ${quantity === 1 ? "peça adicionada" : "peças adicionadas"} ao carrinho.`,
                );
              }}
            >
              Adicionar ao carrinho
            </button>
            <p className="cart-feedback" role="status" aria-live="polite">
              {cartMessage}
            </p>
            {cartMessage && (
              <Link className="text-link" to="/carrinho">
                Ver carrinho
              </Link>
            )}
          </div>
          <section className="product-section">
            <h2>Sobre a peça</h2>
            <p>{product.description}</p>
          </section>
          {facts.length > 0 && (
            <section className="product-section">
              <h2>Detalhes</h2>
              <dl className="product-facts">
                {facts.map((fact) => (
                  <div key={fact.name}>
                    <dt>{fact.name}</dt>
                    <dd>{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
          {product.care && (
            <section className="product-section">
              <h2>Cuidados</h2>
              <p>{product.care}</p>
            </section>
          )}
          <aside className="artisan-note">
            <strong>Feita com tempo e singularidade</strong>
            <p>
              Por ser produzida artesanalmente, cada peça pode apresentar
              pequenas variações de forma, tonalidade e acabamento. São
              particularidades do fazer manual que tornam cada criação única.
            </p>
          </aside>
        </div>
      </article>
      {expandedImage && primaryImage && (
        <ImageDialog
          image={primaryImage}
          productName={product.name}
          onClose={() => setExpandedImage(false)}
        />
      )}
    </>
  );
}
