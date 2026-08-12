import { useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { MenuIcon, ShoppingBagIcon, XIcon } from '../components/common/Icons.jsx'
import { ScrollToTop } from '../components/common/ScrollToTop.jsx'
import { useCart } from '../context/cartContextValue.js'

const navigation = [
  ['/novidades', 'Novidades'],
  ['/brincos', 'Brincos'],
  ['/aneis', 'Anéis'],
  ['/colares', 'Colares'],
  ['/pulseiras', 'Pulseiras'],
  ['/colecoes', 'Coleções'],
  ['/promocoes', 'Promoções'],
  ['/cursos', 'Cursos'],
]

export function SiteLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { getItemCount } = useCart()
  const itemCount = getItemCount()

  return (
    <div className="site-shell">
      <ScrollToTop />
      <a className="skip-link" href="#conteudo-principal">Ir para o conteúdo</a>
      <div className="announcement">Biojoias artesanais <span aria-hidden="true">•</span> Feitas à mão <span aria-hidden="true">•</span> Entrega em configuração</div>
      <header className="site-header">
        <Link className="brand" to="/" aria-label="Brinco de Princesa — início" onClick={() => setMenuOpen(false)}>
          <img src="/brand/brinco-de-princesa-logo.png" width="72" height="72" alt="" />
          <span>Brinco de Princesa</span>
        </Link>

        <button
          className="menu-toggle"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <XIcon /> : <MenuIcon />}
        </button>

        <nav id="primary-navigation" className={menuOpen ? 'primary-nav is-open' : 'primary-nav'} aria-label="Navegação principal">
          {navigation.map(([to, label]) => (
            <Link key={label} to={to} onClick={() => setMenuOpen(false)}>{label}</Link>
          ))}
        </nav>

        <Link className="store-shortcut" to="/carrinho" aria-label={`Carrinho com ${itemCount} ${itemCount === 1 ? 'item' : 'itens'}`}>
          <ShoppingBagIcon />
          <span>Carrinho</span>{itemCount > 0 && <strong className="cart-badge" aria-hidden="true">{itemCount}</strong>}
        </Link>
      </header>

      <main id="conteudo-principal"><Outlet /></main>

      <footer className="site-footer">
        <div className="footer-grid container">
          <div className="footer-brand">
            <img src="/brand/brinco-de-princesa-logo.png" width="84" height="84" alt="" />
            <div><strong>Brinco de Princesa</strong><p>Biojoias artesanais em cerâmica.</p></div>
          </div>
          <div><h2>Loja</h2><Link to="/brincos">Brincos</Link><Link to="/aneis">Anéis</Link><Link to="/colares">Colares</Link><Link to="/pulseiras">Pulseiras</Link><Link to="/colecoes">Coleções</Link><Link to="/promocoes">Promoções</Link></div>
          <div><h2>Descubra</h2><Link to="/sobre">Nossa história</Link><Link to="/como-e-feito">Como é feito</Link><Link to="/cursos">Cursos</Link><Link to="/personalizados">Personalizados</Link></div>
          <div><h2>Atendimento</h2><Link to="/contato">Contato</Link><Link to="/trocas-e-devolucoes">Trocas e devoluções</Link><Link to="/privacidade">Privacidade</Link><Link to="/termos">Termos</Link></div>
        </div>
        <div className="footer-bottom container">
          <span>© {new Date().getFullYear()} Brinco de Princesa.</span>
          <span>Matéria transformada à mão.</span>
        </div>
      </footer>
    </div>
  )
}
