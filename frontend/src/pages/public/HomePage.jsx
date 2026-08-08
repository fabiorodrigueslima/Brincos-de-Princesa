import { Link } from 'react-router-dom'
import { ArrowIcon, HeartIcon, LeafIcon, SparkleIcon } from '../../components/common/Icons.jsx'
import { PageMeta } from '../../components/common/PageMeta.jsx'
import { SectionHeading } from '../../components/common/SectionHeading.jsx'

const processSteps = ['Ideia', 'Criação', 'Resina', 'Acabamento', 'Peça final']

export function HomePage() {
  return (
    <>
      <PageMeta title="Início" description="Brincos artesanais e peças em resina criadas à mão para valorizar sua personalidade." />

      <section className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow">Artesanal • delicado • singular</p>
          <h1>Peças que florescem em cada detalhe.</h1>
          <p>Brincos artesanais e peças em resina criadas à mão para valorizar sua personalidade.</p>
          <div className="button-row">
            <Link className="button button-primary" to="/loja">Conhecer a loja <ArrowIcon /></Link>
            <Link className="button button-ghost" to="/sobre">Nossa história</Link>
          </div>
          <div className="hero-note"><span aria-hidden="true">✦</span> Pequenas tiragens, cuidado em cada etapa.</div>
        </div>
        <div className="hero-visual">
          <img src="/images/hero-artesanal.webp" alt="Brincos artesanais de resina com pequenas flores vinho" width="1536" height="1024" fetchPriority="high" />
          <span className="hero-seal">feito<br />à mão</span>
        </div>
      </section>

      <section className="values-strip" aria-label="Valores da marca">
        <div><LeafIcon /><span><strong>Natureza preservada</strong>Flores eternizadas em resina</span></div>
        <div><HeartIcon /><span><strong>Feito com afeto</strong>Cada peça recebe atenção única</span></div>
        <div><SparkleIcon /><span><strong>Delicadamente singular</strong>Variações que tornam cada peça especial</span></div>
      </section>

      <section className="section container">
        <SectionHeading eyebrow="Nossas inspirações" title="Coleções que guardam histórias" text="Formas, cores e flores se encontram em peças pensadas para acompanhar momentos especiais e dias comuns." />
        <div className="collection-grid">
          <article className="collection-card collection-card-large">
            <img src="/images/pecas-personalizadas.webp" alt="Três pares de brincos florais artesanais" loading="lazy" />
            <div><p className="eyebrow">Coleção</p><h3>Jardim Secreto</h3><p>Flores preservadas em composições únicas.</p><Link to="/colecoes">Descobrir coleção <ArrowIcon /></Link></div>
          </article>
          <article className="collection-card collection-card-wine"><div><p className="eyebrow">Essenciais</p><h3>Delicadeza diária</h3><p>Leves, versáteis e feitas para florescer com você.</p><Link to="/loja">Conhecer peças <ArrowIcon /></Link></div></article>
        </div>
      </section>

      <section className="story-feature">
        <div className="story-image"><img src="/images/processo-artesanal.webp" alt="Mãos da artesã montando cuidadosamente um brinco floral" loading="lazy" /></div>
        <div className="story-copy">
          <p className="eyebrow">Nossa essência</p>
          <h2>Um fazer que respeita o tempo das coisas bonitas.</h2>
          <p>Da escolha das flores ao acabamento final, cada etapa acontece com presença. O resultado são peças leves, delicadas e cheias de pequenos detalhes.</p>
          <Link className="text-link" to="/sobre">Conheça nossa história <ArrowIcon /></Link>
        </div>
      </section>

      <section className="section process-section">
        <div className="container">
          <SectionHeading eyebrow="Como é feito" title="Do primeiro traço à peça final" text="Um processo artesanal em cinco momentos, onde técnica e sensibilidade caminham juntas." />
          <ol className="process-line">
            {processSteps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, '0')}</span><strong>{step}</strong></li>)}
          </ol>
          <div className="center-action"><Link className="button button-ghost" to="/como-e-feito">Ver o processo artesanal</Link></div>
        </div>
      </section>

      <section className="personalized-feature container">
        <div><p className="eyebrow">Feito para você</p><h2>Uma lembrança, uma flor, uma história só sua.</h2><p>Peças personalizadas transformam referências afetivas em criações únicas, desenvolvidas com cuidado e conversa em cada etapa.</p><Link className="button button-primary" to="/personalizados">Quero uma peça personalizada</Link></div>
        <img src="/images/pecas-personalizadas.webp" alt="Seleção de brincos florais personalizados em resina" loading="lazy" />
      </section>

      <section className="closing-cta">
        <div className="container narrow"><p className="eyebrow">Brinco de Princesa</p><h2>Encontre a peça que combina com a sua história.</h2><Link className="button button-light" to="/loja">Explorar a loja <ArrowIcon /></Link></div>
      </section>
    </>
  )
}
