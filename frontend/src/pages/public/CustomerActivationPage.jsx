import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageMeta } from '../../components/common/PageMeta.jsx'
import { customerActivate, customerRequestActivation } from '../../services/api.js'
import './CustomerActivationPage.css'

export function CustomerActivationPage() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [activated, setActivated] = useState(false)
  const submit = async (event) => {
    event.preventDefault()
    setLoading(true)
    try {
      if (token) {
        await customerActivate({ token, password })
        setPassword('')
        setActivated(true)
        setMessage('Conta ativada. Entre com seu e-mail e sua nova senha.')
      } else {
        await customerRequestActivation({ email })
        setMessage('Se houver uma conta elegível, você receberá um link de ativação por e-mail.')
      }
    } catch (error) { setMessage(error.message) }
    finally { setLoading(false) }
  }
  return <section className="activation-page container">
    <PageMeta title="Ativar conta" description="Confirme seu e-mail para ativar uma conta existente." noindex />
    <header className="activation-page__heading">
      <h1>Ativar conta</h1>
      {!activated && <p>{token ? 'Defina uma senha para sua conta. Depois, entre novamente para acessar seus dados.' : 'Já possui um cadastro sem senha? Solicite o link para confirmar que este e-mail é seu.'}</p>}
    </header>
    <div className="activation-page__card">
      {!activated && <form className="activation-page__form" onSubmit={submit}>
        {token ? <div className="activation-page__field">
          <label htmlFor="activation-password">Nova senha</label>
          <input id="activation-password" type="password" minLength="8" maxLength="200" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} required />
        </div> : <div className="activation-page__field">
          <label htmlFor="activation-email">E-mail</label>
          <input id="activation-email" type="email" maxLength="254" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required />
        </div>}
        <button className="button button-primary activation-page__submit" disabled={loading}>{loading ? 'Aguarde…' : token ? 'Ativar conta' : 'Enviar link de ativação'}</button>
      </form>}
      <p className="activation-page__message" role="status">{message}</p>
      <nav className="activation-page__links" aria-label="Acesso à conta">
        <p>Já possui uma conta? <Link to="/login">Entrar</Link></p>
        <p>Esqueceu sua senha? <Link to="/recuperar-senha">Recuperar senha</Link></p>
        {token && <p><Link to="/ativar-conta">Solicitar outro link</Link></p>}
      </nav>
    </div>
  </section>
}
