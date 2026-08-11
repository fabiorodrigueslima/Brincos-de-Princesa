import { Link } from 'react-router-dom'
import { ArrowIcon, HeartIcon, LeafIcon, SparkleIcon } from '../../components/common/Icons.jsx'
import { PageHero } from '../../components/common/PageHero.jsx'
import { PageMeta } from '../../components/common/PageMeta.jsx'

export function AboutPage() {
  return (
    <>
      <PageMeta title="Nossa História" description="Conheça a essência artesanal da Brinco de Princesa e o cuidado por trás de cada criação." />
      <PageHero eyebrow="Nossa história" title="Beleza feita devagar, para durar na memória." text="A Brinco de Princesa nasce do encontro entre delicadeza, natureza e o prazer de criar com as próprias mãos." />
      <section className="split-section container">
        <img src="/images/processo-artesanal-novo.png" alt="Artesã trabalhando em uma peça floral com uma pinça" loading="lazy" width="1122" height="1402" />
        <div><p className="eyebrow">A marca</p><h2>Cada detalhe carrega intenção.</h2><p>Mais do que acessórios, criamos pequenas expressões de identidade. As peças são produzidas artesanalmente, em pequenas quantidades, respeitando o tempo de cura, montagem e acabamento.</p><p>A resina encontra flores, cores e formas em composições que celebram a beleza do singular. Por isso, pequenas variações podem acontecer — e são parte daquilo que torna cada criação especial.</p></div>
      </section>
      <section className="section soft-section"><div className="container"><div className="principles-grid">
        <article><LeafIcon /><h3>Inspiração natural</h3><p>Flores, cores e movimentos orgânicos orientam nossas criações.</p></article>
        <article><HeartIcon /><h3>Cuidado verdadeiro</h3><p>Da seleção dos materiais à embalagem, tudo passa por mãos atentas.</p></article>
        <article><SparkleIcon /><h3>Beleza singular</h3><p>Valorizamos as pequenas diferenças que dão personalidade a cada peça.</p></article>
      </div></div></section>
      <section className="quote-section container narrow"><blockquote>“O artesanal guarda algo que nenhuma produção em massa consegue repetir: presença.”</blockquote><p>Esse é o princípio que orienta cada criação da Brinco de Princesa.</p><Link className="text-link" to="/como-e-feito">Veja como é feito <ArrowIcon /></Link></section>
    </>
  )
}
