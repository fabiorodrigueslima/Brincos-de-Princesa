import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { SiteLayout } from './layouts/SiteLayout.jsx'
import { AboutPage } from './pages/public/AboutPage.jsx'
import { CollectionsPage } from './pages/public/CollectionsPage.jsx'
import { ContactPage } from './pages/public/ContactPage.jsx'
import { HomePage } from './pages/public/HomePage.jsx'
import { LegalPage } from './pages/public/LegalPage.jsx'
import { NotFoundPage } from './pages/public/NotFoundPage.jsx'
import { PersonalizadosPage } from './pages/public/PersonalizadosPage.jsx'
import { ProcessPage } from './pages/public/ProcessPage.jsx'
import { ProductPage } from './pages/public/ProductPage.jsx'
import { StorePreviewPage } from './pages/public/StorePreviewPage.jsx'
import { CartPage } from './pages/public/CartPage.jsx'
import './styles/global.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<HomePage />} />
          <Route path="inicio" element={<Navigate to="/" replace />} />
          <Route path="sobre" element={<AboutPage />} />
          <Route path="colecoes" element={<CollectionsPage />} />
          <Route path="loja" element={<StorePreviewPage />} />
          <Route path="produto/:slug" element={<ProductPage />} />
          <Route path="carrinho" element={<CartPage />} />
          <Route path="personalizados" element={<PersonalizadosPage />} />
          <Route path="como-e-feito" element={<ProcessPage />} />
          <Route path="contato" element={<ContactPage />} />
          <Route path="privacidade" element={<LegalPage type="privacy" />} />
          <Route path="termos" element={<LegalPage type="terms" />} />
          <Route path="trocas-e-devolucoes" element={<LegalPage type="returns" />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
