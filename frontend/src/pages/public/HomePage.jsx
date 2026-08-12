import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ProductCard } from '../../components/commerce/ProductCard.jsx'
import { CourseCard } from '../../components/commerce/CourseCard.jsx'
import { ArrowIcon, HeartIcon, LeafIcon, SparkleIcon } from '../../components/common/Icons.jsx'
import { PageMeta } from '../../components/common/PageMeta.jsx'
import { SectionHeading } from '../../components/common/SectionHeading.jsx'
import { getCourses, getProducts } from '../../services/api.js'

const processSteps = ['Inspiração', 'Modelagem', 'Secagem', 'Queima', 'Acabamento', 'Montagem', 'Biojoia']
const categories = [['Brincos', '/brincos'], ['Anéis', '/aneis'], ['Colares', '/colares'], ['Pulseiras', '/pulseiras']]

export function HomePage() {
  const [newProducts, setNewProducts] = useState([])
  const [courses, setCourses] = useState([])

  useEffect(() => {
    const controller = new AbortController()
    getProducts({ sort: 'newest', page: 1, limit: 4 }, controller.signal)
      .then((response) => setNewProducts(response.data))
      .catch((reason) => { if (reason.name !== 'AbortError') setNewProducts([]) })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    getCourses({ page: 1, limit: 3 }, controller.signal).then((response) => setCourses(response.data)).catch((reason) => { if (reason.name !== 'AbortError') setCourses([]) })
    return () => controller.abort()
  }, [])

  return (
    <>
      <PageMeta title="Biojoias artesanais em cerâmica" description="Biojoias e acessórios autorais em cerâmica, criados à mão pela Brinco de Princesa." />

      <section className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow">Biojoias artesanais</p>
          <h1>Arte moldada à mão. Transformada pelo fogo.</h1>
          <p>Peças autorais em cerâmica criadas artesanalmente para carregar matéria, textura e identidade.</p>
          <div className="button-row">
            <Link className="button button-primary" to="/loja">Conheça as biojoias <ArrowIcon /></Link>
            <Link className="button button-ghost" to="/sobre">Nossa história</Link>
          </div>
          <div className="hero-note"><span aria-hidden="true">✦</span> Pequenas produções, presença em cada etapa.</div>
        </div>
        <div className="hero-visual">
          {/* Substituir por fotografia oficial de cerâmica quando o acervo da cliente estiver disponível. */}
          <img src="/images/brinco-folha-terracota.png" alt="Par de brincos artesanais em tom terracota usado provisoriamente na apresentação da marca" width="1536" height="1024" fetchPriority="high" />
          <span className="hero-seal">feito<br />à mão</span>
        </div>
      </section>

      <section className="values-strip" aria-label="Valores da marca">
        <div><HeartIcon /><span><strong>Feito à mão</strong>Cada peça passa por um processo artesanal cuidadoso.</span></div>
        <div><LeafIcon /><span><strong>Matéria e transformação</strong>Argila, técnica e fogo se encontram em cada criação.</span></div>
        <div><SparkleIcon /><span><strong>Singular por natureza</strong>Pequenas variações revelam a identidade de cada peça.</span></div>
      </section>

      {newProducts.length > 0 && <section className="section container home-new-products">
        <SectionHeading eyebrow="Novidades" title="Peças que acabam de chegar" text="Uma seleção atualizada diretamente do nosso catálogo." align="left" />
        <div className="product-grid">{newProducts.map((product) => <ProductCard key={product.id} product={product} />)}</div>
        <div className="section-action"><Link className="text-link" to="/loja">Ver todas as peças <ArrowIcon /></Link></div>
      </section>}

      <section className="section category-showcase">
        <div className="container">
          <SectionHeading eyebrow="Encontre sua peça" title="Escolha pelo que acompanha você" text="Encontre brincos, anéis, colares e pulseiras organizados diretamente pelo catálogo." />
          <div className="category-links">
            {categories.map(([category, to], index) => <Link key={category} to={to} aria-label={`Explorar o catálogo de ${category}`}><span>0{index + 1}</span><strong>{category}</strong><ArrowIcon /></Link>)}
          </div>
        </div>
      </section>

      <section className="collections-intro container">
        <div>
          <p className="eyebrow">Coleções autorais</p>
          <h2>Formas e texturas reunidas em pequenas séries.</h2>
          <p>Peças criadas a partir de referências que ganham identidade em coleções de produção cuidadosa.</p>
          <Link className="text-link" to="/colecoes">Conheça as coleções <ArrowIcon /></Link>
        </div>
        <div className="collections-material" aria-hidden="true"><span>matéria</span><span>gesto</span><span>fogo</span></div>
      </section>

      <section className="story-feature ceramic-feature">
        <div className="story-image"><img src="/images/processo-artesanal-novo.png" alt="Artesã trabalhando manualmente em uma peça, em fotografia provisória" loading="lazy" width="1122" height="1402" /></div>
        <div className="story-copy">
          <p className="eyebrow">Da matéria à joia</p>
          <h2>A terra encontra o fogo.</h2>
          <p>A cerâmica nasce da transformação. Cada peça começa na matéria, passa pelas mãos, pelo tempo e pelo fogo até ganhar forma e se tornar uma biojoia singular.</p>
          <Link className="text-link" to="/como-e-feito">Conheça o processo <ArrowIcon /></Link>
        </div>
      </section>

      <section className="section process-section">
        <div className="container">
          <SectionHeading eyebrow="Como é feito" title="Um caminho guiado pelas mãos" text="Uma visão conceitual do processo, pronta para ser ajustada quando as etapas técnicas forem confirmadas." />
          <ol className="process-line">
            {processSteps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, '0')}</span><strong>{step}</strong></li>)}
          </ol>
          <div className="center-action"><Link className="button button-ghost" to="/como-e-feito">Ver o processo artesanal</Link></div>
        </div>
      </section>

      <section className="courses-feature">
        <div className="container narrow">
          <p className="eyebrow">Cursos</p>
          <h2>Aprenda a transformar cerâmica em expressão.</h2>
          <p>{courses.length > 0 ? 'Conheça as experiências artesanais publicadas pela Brinco de Princesa.' : 'Novas experiências estão sendo preparadas para compartilhar processos e encontros relacionados ao fazer artesanal.'}</p>
          <Link className="button button-light" to="/cursos">Conheça os cursos</Link>
        </div>
        {courses.length > 0 && <div className="course-grid home-course-grid container">{courses.map((course) => <CourseCard key={course.id} course={course} />)}</div>}
      </section>

      <section className="personalized-feature container">
        <div><p className="eyebrow">Feito para você</p><h2>Uma ideia, uma memória, uma intenção.</h2><p>Peças personalizadas podem nascer de uma referência especial e de uma conversa cuidadosa sobre possibilidades, materiais e formas.</p><Link className="button button-primary" to="/personalizados">Conheça os personalizados</Link></div>
        <img src="/images/brinco-folha-dourada.png" alt="Brincos artesanais dourados em formato de folha" loading="lazy" width="1145" height="1374" />
      </section>

      <section className="closing-cta">
        <div className="container narrow"><p className="eyebrow">Brinco de Princesa</p><h2>Biojoias para vestir matéria, gesto e identidade.</h2><Link className="button button-light" to="/loja">Explorar a loja <ArrowIcon /></Link></div>
      </section>
    </>
  )
}
