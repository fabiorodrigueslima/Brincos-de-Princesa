import { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import {
  FacebookIcon,
  InstagramIcon,
  MenuIcon,
  ShoppingBagIcon,
  TikTokIcon,
  XIcon,
  YoutubeIcon,
} from "../components/common/Icons.jsx";
import { ScrollToTop } from "../components/common/ScrollToTop.jsx";
import { useCart } from "../context/cartContextValue.js";
import { useCustomerAuth } from "../context/customerAuthContext.jsx";

const navigation = [
  ["/novidades", "Novidades"],
  ["/brincos", "Brincos"],
  ["/aneis", "Anéis"],
  ["/colares", "Colares"],
  ["/pulseiras", "Pulseiras"],
  ["/colecoes", "Coleções"],
  ["/promocoes", "Promoções"],
  ["/cursos", "Cursos"],
];

export function SiteLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const { getItemCount } = useCart();
  const { user, loading: authLoading, signOut } = useCustomerAuth();
  const itemCount = getItemCount();

  return (
    <div className="site-shell">
      <ScrollToTop />
      <a className="skip-link" href="#conteudo-principal">
        Ir para o conteúdo
      </a>
      <div className="announcement">
        Biojoias artesanais <span aria-hidden="true">•</span> Feitas à mão{" "}
        <span aria-hidden="true">•</span> Enviamos para todo o Brasil
      </div>
      <header className="site-header">
        <Link
          className="brand"
          to="/"
          aria-label="Brinco de Princesa — início"
          onClick={() => setMenuOpen(false)}
        >
          <img
            src="/brand/brinco-de-princesa-logo.png"
            width="72"
            height="72"
            alt=""
          />
          <span>Brinco de Princesa</span>
        </Link>

        <button
          className="menu-toggle"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <XIcon /> : <MenuIcon />}
        </button>

        <nav
          id="primary-navigation"
          className={menuOpen ? "primary-nav is-open" : "primary-nav"}
          aria-label="Navegação principal"
        >
          {navigation.map(([to, label]) => (
            <Link key={label} to={to} onClick={() => setMenuOpen(false)}>
              {label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          {!authLoading && (user ? <div className="account-menu">
            <button className="account-trigger" type="button" aria-expanded={accountOpen} aria-controls="customer-account-menu" onClick={() => setAccountOpen((open) => !open)}>
              <img src="/brand/brinco-de-princesa-logo.png" width="36" height="36" alt="" />
              <span>{user.nome || user.name || "Minha conta"}</span>
            </button>
            {accountOpen && <div id="customer-account-menu" className="account-dropdown">
              <Link to="/minha-conta" onClick={() => setAccountOpen(false)}>Minha conta</Link>
              <Link to="/minha-conta#pedidos" onClick={() => setAccountOpen(false)}>Minhas compras</Link>
              <button type="button" onClick={async () => { await signOut(); setAccountOpen(false) }}>Sair</button>
            </div>}
          </div> : <Link className="account-login" to="/login">Entrar</Link>)}
          <Link
            className="store-shortcut"
            to="/carrinho"
            aria-label={`Carrinho com ${itemCount} ${itemCount === 1 ? "item" : "itens"}`}
          >
            <ShoppingBagIcon />
            <span>Carrinho</span>
            {itemCount > 0 && (
              <strong className="cart-badge" aria-hidden="true">
                {itemCount}
              </strong>
            )}
          </Link>
        </div>
      </header>

      <main id="conteudo-principal">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="footer-grid container">
          <div className="footer-brand">
            <img
              src="/brand/brinco-de-princesa-logo.png"
              width="84"
              height="84"
              alt=""
            />
            <div>
              <strong>Brinco de Princesa</strong>
              <p>Biojoias artesanais em cerâmica.</p>
            </div>
          </div>
          <div>
            <h2>Loja</h2>
            <Link to="/brincos">Brincos</Link>
            <Link to="/aneis">Anéis</Link>
            <Link to="/colares">Colares</Link>
            <Link to="/pulseiras">Pulseiras</Link>
            <Link to="/colecoes">Coleções</Link>
            <Link to="/promocoes">Promoções</Link>
          </div>
          <div>
            <h2>Descubra</h2>
            <Link to="/sobre">Nossa história</Link>
            <Link to="/como-e-feito">Como é feito</Link>
            <Link to="/contato">Cursos — em breve</Link>
            <Link to="/personalizados">Personalizados</Link>
          </div>
          <div>
            <h2>Atendimento</h2>
            <Link to="/contato">Contato</Link>
            <Link to="/trocas-e-devolucoes">Trocas e devoluções</Link>
            <Link to="/privacidade">Privacidade</Link>
            <Link to="/termos">Termos</Link>
          </div>
          <div className="footer-social">
            <h2>Siga a marca</h2>
            <p>Veja novas peças, bastidores e inspirações.</p>
            <div className="footer-social-links">
              <a href="https://www.instagram.com/brinco_de_princesa__/" target="_blank" rel="noreferrer" aria-label="Instagram" title="Instagram"><InstagramIcon /></a>
              <a href="https://www.tiktok.com/@brinco.de.princes" target="_blank" rel="noreferrer" aria-label="TikTok" title="TikTok"><TikTokIcon /></a>
              <a href="https://www.facebook.com/share/1ETwNcWhKS/" target="_blank" rel="noreferrer" aria-label="Facebook" title="Facebook"><FacebookIcon /></a>
              <a href="https://www.youtube.com/@neida.botanica" target="_blank" rel="noreferrer" aria-label="YouTube" title="YouTube"><YoutubeIcon /></a>
            </div>
          </div>
        </div>
        <div className="footer-bottom container">
          <span>© {new Date().getFullYear()} Brinco de Princesa. Todos os direitos reservados.</span>
          <span>Matéria transformada à mão.</span>
        </div>
      </footer>
    </div>
  );
}
