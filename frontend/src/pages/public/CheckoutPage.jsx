import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageMeta } from '../../components/common/PageMeta.jsx'
import { useCart } from '../../context/cartContextValue.js'
import { createOrder, createPayment, lookupPostalCode, quoteCheckout } from '../../services/api.js'
import { formatPostalCode, hasErrors, normalizePostalCode, validateAddress, validateCustomer } from './checkoutModel.js'
import { useCustomerAuth } from '../../context/customerAuthContext.jsx'

const money = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))
const blankCustomer = { name: '', email: '', phone: '' }
const blankAddress = { postalCode: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' }

function Field({ label, name, value, error, onChange, ...props }) {
  return <label className={`checkout-field ${error ? 'has-error' : ''}`}><span>{label}</span><input name={name} value={value} onChange={onChange} aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : undefined} {...props} />{error && <small id={`${name}-error`}>{error}</small>}</label>
}

export function CheckoutPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useCustomerAuth()
  const { items, clearCart } = useCart()
  const [step, setStep] = useState(1)
  const [customer, setCustomer] = useState(blankCustomer)
  const [address, setAddress] = useState(blankAddress)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [quote, setQuote] = useState(null)
  const [loading, setLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('PIX')
  const form = useRef(null)
  useEffect(() => {
    if (!authLoading && !user && items.length) navigate('/login?next=/checkout', { replace: true })
  }, [authLoading, items.length, navigate, user])
  const focusError = () => requestAnimationFrame(() => form.current?.querySelector('[aria-invalid="true"]')?.focus())
  const update = (setter) => (event) => setter((current) => ({ ...current, [event.target.name]: event.target.value }))

  const submitCustomer = (event) => { event.preventDefault(); const next = validateCustomer(customer); setErrors(next); if (hasErrors(next)) return focusError(); setErrors({}); setStep(2); setMessage('Identificação validada. Informe o endereço de entrega.') }
  const findPostalCode = async () => {
    const postalCode = normalizePostalCode(address.postalCode)
    if (postalCode.length !== 8) { setErrors({ postalCode: 'Informe um CEP com 8 números.' }); return focusError() }
    setLoading(true); setMessage('Consultando CEP…')
    try { const { data } = await lookupPostalCode(postalCode); setAddress((current) => ({ ...current, postalCode, street: data.street || current.street, neighborhood: data.neighborhood || current.neighborhood, city: data.city || current.city, state: data.state || current.state })); setErrors({}); setMessage('Endereço encontrado. Confira os dados.') }
    catch (error) { setMessage(`${error.message} Você ainda pode preencher o endereço manualmente.`) } finally { setLoading(false) }
  }
  const requestQuote = async (shippingOptionId) => {
    setLoading(true); setMessage('Revalidando preços, estoque e entrega…')
    try {
      const payload = { items, customer: { name: customer.name.trim(), email: customer.email.trim(), phone: customer.phone.trim() }, address: { ...address, postalCode: normalizePostalCode(address.postalCode), state: address.state.toUpperCase() }, ...(shippingOptionId ? { shippingOptionId } : {}) }
      const { data } = await quoteCheckout(payload); setQuote(data); setStep(shippingOptionId ? 4 : 3); setMessage(shippingOptionId ? 'Total atualizado com a entrega selecionada.' : 'Escolha uma opção de entrega.')
    } catch (error) { setQuote(null); setMessage(error.message) } finally { setLoading(false) }
  }
  const submitAddress = (event) => { event.preventDefault(); const next = validateAddress(address); setErrors(next); if (hasErrors(next)) return focusError(); requestQuote() }
  const startPayment = async () => {
    if (!quote?.selectedShipping) return
    setLoading(true); setMessage('Criando pedido e abrindo o ambiente seguro do Mercado Pago…')
    try {
      const payload = { items, customer: { name: customer.name.trim(), email: customer.email.trim(), phone: customer.phone.trim() }, address: { ...address, postalCode: normalizePostalCode(address.postalCode), state: address.state.toUpperCase() }, shippingOptionId: quote.selectedShipping.id }
      const order = (await createOrder(payload, crypto.randomUUID())).data
      sessionStorage.setItem(`brinco-de-princesa:order:${order.code}`, order.accessToken)
      const payment = (await createPayment(order.code, order.accessToken, paymentMethod, crypto.randomUUID())).data
      clearCart()
      window.location.assign(payment.checkoutUrl)
    } catch (error) { setMessage(error.message); setLoading(false) }
  }

  if (!items.length) return <section className="cart-empty container"><PageMeta title="Checkout" description="Checkout da Brinco de Princesa." noindex /><h1>Seu carrinho está vazio.</h1><p>Escolha uma peça antes de iniciar o checkout.</p><Link className="button button-primary" to="/loja">Continuar comprando</Link></section>
  if (authLoading || !user) return <section className="cart-empty container"><PageMeta title="Acesso ao checkout" description="Entre na sua conta para finalizar a compra." noindex /><h1>Preparando seu checkout.</h1><p>Entre ou crie sua conta para continuar com segurança.</p><Link className="button button-primary" to="/login?next=/checkout">Entrar na conta</Link></section>

  return <section className="checkout-page container"><PageMeta title="Checkout" description="Identificação, entrega e revisão da compra." noindex />
    <header className="checkout-heading"><p className="eyebrow">Checkout seguro</p><h1>Revise cada detalhe</h1><p>Seus dados ficam apenas nesta tela. Nenhum pedido será criado nesta fase.</p></header>
    <ol className="checkout-steps" aria-label="Etapas do checkout">{['Identificação','Endereço','Entrega','Revisão'].map((label, index) => <li key={label} className={step >= index + 1 ? 'active' : ''} aria-current={step === index + 1 ? 'step' : undefined}><span>{index + 1}</span>{label}</li>)}</ol>
    <p className="checkout-status" role="status" aria-live="polite">{message}</p>
    {step === 1 && <form ref={form} className="checkout-form" noValidate onSubmit={submitCustomer}><fieldset><legend>Identificação</legend><p>Dados mínimos para preparar a revisão da compra.</p><Field label="Nome completo" name="name" value={customer.name} error={errors.name} onChange={update(setCustomer)} autoComplete="name" /><Field label="E-mail" name="email" type="email" inputMode="email" value={customer.email} error={errors.email} onChange={update(setCustomer)} autoComplete="email" /><Field label="Telefone" name="phone" type="tel" inputMode="tel" value={customer.phone} error={errors.phone} onChange={update(setCustomer)} autoComplete="tel" /></fieldset><button className="button button-primary" type="submit">Continuar para endereço</button></form>}
    {step === 2 && <form ref={form} className="checkout-form" noValidate onSubmit={submitAddress}><fieldset><legend>Endereço de entrega</legend><div className="postal-row"><Field label="CEP" name="postalCode" inputMode="numeric" value={formatPostalCode(address.postalCode)} error={errors.postalCode} onChange={(event) => setAddress((current) => ({ ...current, postalCode: normalizePostalCode(event.target.value) }))} autoComplete="postal-code" /><button className="button button-ghost" type="button" disabled={loading} onClick={findPostalCode}>Buscar CEP</button></div><Field label="Logradouro" name="street" value={address.street} error={errors.street} onChange={update(setAddress)} autoComplete="address-line1" /><div className="field-pair"><Field label="Número ou S/N" name="number" value={address.number} error={errors.number} onChange={update(setAddress)} /><Field label="Complemento (opcional)" name="complement" value={address.complement} onChange={update(setAddress)} /></div><Field label="Bairro" name="neighborhood" value={address.neighborhood} error={errors.neighborhood} onChange={update(setAddress)} /><div className="field-pair city-state"><Field label="Cidade" name="city" value={address.city} error={errors.city} onChange={update(setAddress)} /><Field label="UF" name="state" maxLength="2" value={address.state} error={errors.state} onChange={(event) => setAddress((current) => ({ ...current, state: event.target.value.toUpperCase() }))} /></div></fieldset><div className="checkout-actions"><button className="button button-ghost" type="button" onClick={() => setStep(1)}>Voltar</button><button className="button button-primary" disabled={loading} type="submit">Consultar entrega</button></div></form>}
    {step === 3 && quote && <fieldset className="shipping-options"><legend>Opções de entrega</legend>{quote.shippingOptions.map((option) => <button key={option.id} type="button" disabled={loading} onClick={() => requestQuote(option.id)}><span><strong>{option.service}</strong>{option.carrier && <small>{option.carrier}</small>}{option.estimatedDays != null && <small>Até {option.estimatedDays} dias</small>}</span><strong>{money(option.price)}</strong></button>)}</fieldset>}
    {step === 4 && quote?.selectedShipping && <div className="checkout-review"><h2>Revisão da compra</h2>{quote.items.map((item) => <article key={item.variantId}><span>{item.quantity}× {item.productName} — {item.variantName}</span><strong>{money(item.subtotal)}</strong></article>)}<dl><div><dt>Subtotal</dt><dd>{money(quote.subtotal)}</dd></div><div><dt>Entrega — {quote.selectedShipping.service}</dt><dd>{money(quote.shipping)}</dd></div><div className="review-total"><dt>Total</dt><dd>{money(quote.total)}</dd></div></dl><section><h3>Entrega</h3><p>{address.street}, {address.number}{address.complement ? ` — ${address.complement}` : ''}<br />{address.neighborhood}, {address.city}/{address.state}<br />CEP {formatPostalCode(address.postalCode)}</p></section><fieldset><legend>Forma de pagamento</legend><label><input type="radio" name="paymentMethod" value="PIX" checked={paymentMethod === 'PIX'} onChange={(event) => setPaymentMethod(event.target.value)} /> Pix</label><label><input type="radio" name="paymentMethod" value="CARD" checked={paymentMethod === 'CARD'} onChange={(event) => setPaymentMethod(event.target.value)} /> Cartão no Mercado Pago</label></fieldset><button className="button button-primary" type="button" disabled={loading} onClick={startPayment}>{loading ? 'Preparando pagamento…' : 'Pagar com Mercado Pago'}</button><p>O pagamento é concluído no ambiente seguro do Mercado Pago e confirmado por webhook.</p></div>}
  </section>
}
