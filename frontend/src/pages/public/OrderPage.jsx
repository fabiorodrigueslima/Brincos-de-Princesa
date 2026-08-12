import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { PageMeta } from '../../components/common/PageMeta.jsx'
import { getOrder } from '../../services/api.js'
import { orderStatusLabel } from './orderModel.js'

const money = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))

export function OrderPage() {
  const { code } = useParams()
  const { state } = useLocation()
  const accessToken = state?.accessToken
  const [result, setResult] = useState({ data: null, error: '' })

  useEffect(() => {
    if (!accessToken) return
    const controller = new AbortController()
    getOrder(code, accessToken, controller.signal).then((response) => setResult({ data: response.data, error: '' })).catch((error) => { if (error.name !== 'AbortError') setResult({ data: null, error: error.message }) })
    return () => controller.abort()
  }, [accessToken, code])

  if (!accessToken) return <section className="catalog-state product-state container"><PageMeta title="Pedido protegido" description="Consulta protegida de pedido." noindex /><h1>Acesso protegido</h1><p>Abra esta página a partir da confirmação do checkout. O token do pedido não é incluído no endereço.</p><Link className="button button-primary" to="/loja">Voltar à loja</Link></section>
  if (result.error) return <section className="catalog-state catalog-error product-state container"><PageMeta title="Pedido indisponível" description="Não foi possível consultar este pedido." noindex /><h1>Não foi possível consultar o pedido.</h1><p>{result.error}</p></section>
  if (!result.data) return <div className="catalog-state product-state" role="status" aria-live="polite"><span className="loader" aria-hidden="true" />Consultando pedido…</div>
  const order = result.data
  return <article className="order-page container"><PageMeta title={`Pedido ${order.codigo_publico}`} description="Acompanhe o estado do pedido." noindex /><p className="eyebrow">Pedido protegido</p><h1>{order.codigo_publico}</h1><p className="order-status" role="status">{orderStatusLabel[order.status] || order.status}</p><div className="order-items">{order.items.map((item, index) => <div key={`${item.nome_produto}-${index}`}><span>{item.quantidade}× {item.nome_produto} — {item.nome_variante}</span><strong>{money(item.subtotal)}</strong></div>)}</div><dl className="order-totals"><div><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div><div><dt>Entrega</dt><dd>{money(order.frete)}</dd></div><div><dt>Total</dt><dd>{money(order.total)}</dd></div></dl>{order.status === 'PENDING_PAYMENT' && <p>O pagamento ainda não foi confirmado pelo provedor. Esta página não confirma pagamentos por conta própria.</p>}</article>
}
