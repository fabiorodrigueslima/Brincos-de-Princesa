import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageMeta } from '../../components/common/PageMeta.jsx'
import { useCart } from '../../context/cartContextValue.js'
import { validateCart } from '../../services/api.js'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const money = (value) => currency.format(Number(value))

function availabilityMessage(item) {
  if (item.reason === 'INSUFFICIENT_STOCK') return `Temos apenas ${item.availableStock} unidades disponíveis.`
  if (item.reason === 'OUT_OF_STOCK' || item.reason === 'INACTIVE' || item.reason === 'VARIANT_NOT_FOUND') return 'Produto indisponível.'
  return ''
}

function ClearCartDialog({ onCancel, onConfirm }) {
  const cancelButton = useRef(null)

  useEffect(() => {
    const previousFocus = document.activeElement
    cancelButton.current?.focus()
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus()
    }
  }, [onCancel])

  return <div className="cart-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel() }}>
    <div className="cart-dialog" role="dialog" aria-modal="true" aria-labelledby="clear-cart-title" aria-describedby="clear-cart-description">
      <p className="eyebrow">Organização do carrinho</p>
      <h2 id="clear-cart-title">Esvaziar carrinho?</h2>
      <p id="clear-cart-description">Todas as peças escolhidas serão removidas do seu carrinho.</p>
      <div className="cart-dialog-actions">
        <button ref={cancelButton} className="button button-ghost" type="button" onClick={onCancel}>Manter peças</button>
        <button className="button button-primary" type="button" onClick={onConfirm}>Esvaziar carrinho</button>
      </div>
    </div>
  </div>
}

export function CartPage() {
  const { items, removeItem, updateQuantity, clearCart } = useCart()
  const [result, setResult] = useState({ key: '', data: null, error: '' })
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false)
  const itemsKey = JSON.stringify(items)

  useEffect(() => {
    if (items.length === 0) return
    const controller = new AbortController()
    validateCart(items, controller.signal)
      .then((response) => setResult({ key: itemsKey, data: response.data, error: '' }))
      .catch((reason) => { if (reason.name !== 'AbortError') setResult({ key: itemsKey, data: null, error: reason.message }) })
    return () => controller.abort()
  }, [items, itemsKey])

  const validated = result.key === itemsKey ? result.data : null
  const error = result.key === itemsKey ? result.error : ''

  const changeQuantity = (item, next) => {
    if (next < 1) return
    if (next > item.availableStock || next > 99) return
    updateQuantity(item.variantId, next)
  }

  if (items.length === 0) return <section className="cart-empty container"><PageMeta title="Carrinho" description="Seu carrinho de compras." /><h1>Seu carrinho está vazio.</h1><p>As próximas peças que encantarem você aparecerão aqui.</p><Link className="button button-primary" to="/loja">Conhecer a loja</Link></section>

  return <section className="cart-page container">
    <PageMeta title="Carrinho" description="Revise as peças escolhidas." />
    <div className="cart-heading"><div><p className="eyebrow">Suas escolhas</p><h1>Carrinho</h1></div><button className="text-button" type="button" onClick={() => setIsClearDialogOpen(true)}>Limpar carrinho</button></div>
    <div className="cart-announcement" aria-live="polite">{error || (!validated ? 'Atualizando preços e disponibilidade…' : `${validated.items.length} item(ns) validado(s).`)}</div>
    {error && <div className="catalog-state catalog-error"><h2>Não foi possível validar o carrinho.</h2><p>{error}</p><button className="button button-secondary" type="button" onClick={() => window.location.reload()}>Tentar novamente</button></div>}
    {!error && !validated && <div className="catalog-state"><span className="loader" />Consultando preços e estoque atuais…</div>}
    {validated && <div className="cart-layout"><div className="cart-items">{validated.items.map((item) => <article className={`cart-item ${item.available ? '' : 'cart-item-unavailable'}`} key={item.variantId}>
      <div className="cart-item-image">{item.image ? <img src={item.image.url} alt={item.image.alt || ''} /> : <img src="/brand/brinco-de-princesa-logo.png" alt="" />}</div>
      <div className="cart-item-info"><Link to={item.productSlug ? `/produto/${item.productSlug}` : '/loja'}><h2>{item.productName || 'Produto não encontrado'}</h2></Link><p>{item.variantName || `Variante ${item.variantId}`}</p><small>{item.sku}</small>{!item.available && <strong className="cart-warning" role="status">{availabilityMessage(item)}</strong>}</div>
      <div className="cart-price">{item.unitPrice ? money(item.unitPrice) : '—'}</div>
      <div className="quantity-control" aria-label={`Quantidade de ${item.productName || 'produto'}`}><button type="button" aria-label="Diminuir quantidade" disabled={!item.available || item.quantity <= 1} onClick={() => changeQuantity(item, item.quantity - 1)}>−</button><span aria-live="polite">{item.quantity}</span><button type="button" aria-label="Aumentar quantidade" disabled={!item.available || item.quantity >= item.availableStock || item.quantity >= 99} onClick={() => changeQuantity(item, item.quantity + 1)}>+</button></div>
      <strong className="cart-subtotal">{item.subtotal ? money(item.subtotal) : '—'}</strong>
      <button className="remove-item" type="button" aria-label={`Remover ${item.productName || 'produto'} do carrinho`} onClick={() => removeItem(item.variantId)}>Remover</button>
    </article>)}</div><aside className="cart-summary"><h2>Resumo</h2><div><span>Subtotal</span><strong>{money(validated.subtotal)}</strong></div><div><span>Frete</span><span>Consultado no checkout</span></div><p>Os preços e a disponibilidade foram conferidos agora. O carrinho não reserva estoque.</p>{validated.items.every((item) => item.available) && <Link className="button button-primary" to="/checkout">Ir para o checkout</Link>}<Link className="button button-ghost" to="/loja">Continuar comprando</Link></aside></div>}
    {isClearDialogOpen && <ClearCartDialog onCancel={() => setIsClearDialogOpen(false)} onConfirm={() => { clearCart(); setIsClearDialogOpen(false) }} />}
  </section>
}
