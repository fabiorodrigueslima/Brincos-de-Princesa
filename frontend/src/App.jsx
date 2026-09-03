import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { SiteLayout } from "./layouts/SiteLayout.jsx";
import { AboutPage } from "./pages/public/AboutPage.jsx";
import { CollectionsPage } from "./pages/public/CollectionsPage.jsx";
import { ContactPage } from "./pages/public/ContactPage.jsx";
import { HomePage } from "./pages/public/HomePage.jsx";
import { LegalPage } from "./pages/public/LegalPage.jsx";
import { NotFoundPage } from "./pages/public/NotFoundPage.jsx";
import { PersonalizadosPage } from "./pages/public/PersonalizadosPage.jsx";
import { ProcessPage } from "./pages/public/ProcessPage.jsx";
import { ProductPage } from "./pages/public/ProductPage.jsx";
import { StorePreviewPage } from "./pages/public/StorePreviewPage.jsx";
import { CartPage } from "./pages/public/CartPage.jsx";
import { CategoryCatalogPage } from "./pages/public/CategoryCatalogPage.jsx";
import { CollectionPage } from "./pages/public/CollectionPage.jsx";
import { CoursesPage } from "./pages/public/CoursesPage.jsx";
import { CoursePage } from "./pages/public/CoursePage.jsx";
import { CheckoutPage } from "./pages/public/CheckoutPage.jsx";
import { CustomerAccountPage } from "./pages/public/CustomerAccountPage.jsx";
import { CustomerAuthPage } from "./pages/public/CustomerAuthPage.jsx";
import "./styles/global.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<HomePage />} />
          <Route path="inicio" element={<Navigate to="/" replace />} />
          <Route path="sobre" element={<AboutPage />} />
          <Route path="colecoes" element={<CollectionsPage />} />
          <Route path="colecoes/:slug" element={<CollectionPage />} />
          <Route path="loja" element={<StorePreviewPage />} />
          <Route
            path="brincos"
            element={<CategoryCatalogPage category="brincos" />}
          />
          <Route
            path="aneis"
            element={<CategoryCatalogPage category="aneis" />}
          />
          <Route
            path="colares"
            element={<CategoryCatalogPage category="colares" />}
          />
          <Route
            path="pulseiras"
            element={<CategoryCatalogPage category="pulseiras" />}
          />
          <Route
            path="novidades"
            element={
              <StorePreviewPage
                title="Peças recém-chegadas"
                eyebrow="Novidades"
                description="Conheça as peças publicadas mais recentemente no catálogo."
              />
            }
          />
          <Route
            path="promocoes"
            element={
              <StorePreviewPage
                promotions
                title="Ofertas da coleção"
                eyebrow="Promoções"
                description="Peças com preço promocional real, validado diretamente pelo catálogo."
                emptyText="Nenhuma promoção está disponível no momento."
              />
            }
          />
          <Route path="cursos" element={<CoursesPage />} />
          <Route path="cursos/:slug" element={<CoursePage />} />
          <Route path="produto/:slug" element={<ProductPage />} />
          <Route path="carrinho" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="login" element={<CustomerAuthPage mode="login" />} />
          <Route path="cadastro" element={<CustomerAuthPage mode="register" />} />
          <Route path="recuperar-senha" element={<CustomerAuthPage mode="forgot" />} />
          <Route path="redefinir-senha" element={<CustomerAuthPage mode="reset" />} />
          <Route path="minha-conta" element={<CustomerAccountPage />} />
          <Route path="personalizados" element={<PersonalizadosPage />} />
          <Route path="como-e-feito" element={<ProcessPage />} />
          <Route path="contato" element={<ContactPage />} />
          <Route path="privacidade" element={<LegalPage type="privacy" />} />
          <Route path="termos" element={<LegalPage type="terms" />} />
          <Route
            path="trocas-e-devolucoes"
            element={<LegalPage type="returns" />}
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
