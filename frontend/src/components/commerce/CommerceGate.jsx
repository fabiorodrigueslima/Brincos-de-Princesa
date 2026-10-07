import { Link } from 'react-router-dom';
import { useStorefront } from '../../context/storefrontContext.js';

export function CommerceGate({ children }) {
  const { mode, loading } = useStorefront();
  if (mode === 'commerce') return children;
  return <section className="container cart-empty">
    <h1>{loading ? 'Carregando…' : 'Conheça nossas peças'}</h1>
    <p>{mode === 'catalog' ? 'As compras online estarão disponíveis em breve. Enquanto isso, explore nosso catálogo ou fale conosco.' : 'As compras online estão indisponíveis no momento.'}</p>
    <Link className="button button-primary" to="/loja">Ver catálogo</Link>{' '}
    <Link className="text-link" to="/contato">Fale conosco</Link>
  </section>;
}
