import { Link } from 'react-router-dom'
import { PageMeta } from '../../components/common/PageMeta.jsx'

export function NotFoundPage() {
  return (
    <section className="not-found container narrow">
      <PageMeta title="Página não encontrada" description="O endereço informado não foi encontrado." />
      <p className="eyebrow">Erro 404</p>
      <h1>Esta página não floresceu por aqui.</h1>
      <p>O endereço pode ter mudado ou não existir.</p>
      <Link className="button button-primary" to="/">Voltar ao início</Link>
    </section>
  )
}
