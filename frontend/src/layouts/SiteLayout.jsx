import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { MenuIcon, ShoppingBagIcon, XIcon } from '../components/common/Icons.jsx'
import { ScrollToTop } from '../components/common/ScrollToTop.jsx'
import { useCart } from '../context/cartContextValue.js'

const navigation = [
  ['/', 'Início'],
  ['/sobre', 'Nossa História'],
  ['/colecoes', 'Coleções'],
  ['/loja', 'Loja'],
  ['/personalizados', 'Personalizados'],
  ['/como-e-feito', 'Como é feito'],
  ['/contato', 'Contato'],
]

export function SiteLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { getItemCount } = useCart()
  const itemCount = getItemCount()

  return (
    <div className="site-shell">
      <ScrollToTop />
      <a className="skip-link" href="#conteudo-principal">Ir para o conteúdo</a>
      <div className="announcement">Feito à mão, com tempo, afeto e delicadeza.</div>
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
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setMenuOpen(false)}>{label}</NavLink>
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
            <div><strong>Brinco de Princesa</strong><p>Peças que florescem em cada detalhe.</p></div>
          </div>
          <div><h2>Descubra</h2><Link to="/sobre">Nossa história</Link><Link to="/como-e-feito">Processo artesanal</Link><Link to="/personalizados">Personalizados</Link></div>
          <div><h2>Atendimento</h2><Link to="/contato">Contato</Link><Link to="/trocas-e-devolucoes">Trocas e devoluções</Link><Link to="/loja">Loja</Link></div>
          <div><h2>Transparência</h2><Link to="/privacidade">Privacidade</Link><Link to="/termos">Termos de uso</Link><p>Somente cookies essenciais.</p></div>
        </div>
        <div className="footer-bottom container">
          <span>© {new Date().getFullYear()} Brinco de Princesa.</span>
          <span>Artesanal por natureza.</span>
        </div>
      </footer>
    </div>
  )
}
