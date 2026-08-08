import { Link } from 'react-router-dom'
import { ArrowIcon } from '../../components/common/Icons.jsx'
import { PageHero } from '../../components/common/PageHero.jsx'
import { PageMeta } from '../../components/common/PageMeta.jsx'

const collections = [
  { name: 'Jardim Secreto', text: 'Flores preservadas e composições que parecem guardar um pequeno jardim.', position: 'center' },
  { name: 'Entre Pétalas', text: 'Tons suaves, transparências e formas leves para o cotidiano.', position: 'bottom' },
  { name: 'Vinho & Ouro', text: 'Contrastes marcantes para peças delicadas com presença.', position: 'top' },
]

export function CollectionsPage() {
  return (
    <>
      <PageMeta title="Coleções" description="Descubra coleções artesanais inspiradas em flores, natureza e histórias singulares." />
      <PageHero eyebrow="Coleções" title="Pequenos universos para descobrir." text="Cada coleção parte de uma atmosfera, uma cor ou uma memória e ganha forma em séries de pequenas tiragens." />
      <section className="section container"><div className="editorial-grid">
        {collections.map((collection, index) => <article key={collection.name} className="editorial-card">
          <img src={index === 1 ? '/images/hero-artesanal.webp' : '/images/pecas-personalizadas.webp'} alt="" style={{ objectPosition: collection.position }} />
          <div><span>0{index + 1}</span><h2>{collection.name}</h2><p>{collection.text}</p><Link to="/loja">Ver na loja <ArrowIcon /></Link></div>
        </article>)}
      </div></section>
      <section className="closing-cta"><div className="container narrow"><p className="eyebrow">Criação contínua</p><h2>Novas flores, formas e histórias chegam aos poucos.</h2><Link className="button button-light" to="/contato">Acompanhar novidades</Link></div></section>
    </>
  )
}
