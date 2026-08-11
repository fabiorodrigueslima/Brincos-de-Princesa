import { Link } from 'react-router-dom'
import { ArrowIcon } from '../../components/common/Icons.jsx'
import { PageHero } from '../../components/common/PageHero.jsx'
import { PageMeta } from '../../components/common/PageMeta.jsx'

const steps = [
  ['01', 'Ideia', 'A inspiração começa em uma flor, uma paleta ou uma forma que merece ganhar vida.'],
  ['02', 'Criação', 'Composição, proporção e leveza são pensadas antes de cada peça tomar forma.'],
  ['03', 'Resina', 'Os elementos são posicionados à mão e recebem a resina em etapas cuidadosas.'],
  ['04', 'Acabamento', 'Lixamento, polimento e montagem revelam o brilho e o conforto da peça.'],
  ['05', 'Peça final', 'Cada criação passa por uma última inspeção antes de seguir para você.'],
]

export function ProcessPage() {
  return (
    <>
      <PageMeta title="Como é feito" description="Conheça o processo artesanal por trás das peças em resina da Brinco de Princesa." />
      <PageHero eyebrow="Processo artesanal" title="Mãos, matéria e tempo." text="Criar à mão é acompanhar cada transformação de perto. Conheça as etapas que fazem cada peça florescer." />
      <section className="process-story container">
        <div className="process-sticky"><img src="/images/processo-artesanal-novo.png" alt="Artesã trabalhando cuidadosamente na montagem de um brinco" width="1122" height="1402" /></div>
        <ol className="process-details">{steps.map(([number, title, text]) => <li key={number}><span>{number}</span><div><h2>{title}</h2><p>{text}</p></div></li>)}</ol>
      </section>
      <section className="care-banner"><div className="container narrow"><p className="eyebrow">Por que artesanal?</p><h2>Porque detalhes importantes não pedem pressa.</h2><p>O tempo manual permite olhar, ajustar e cuidar. Também significa que pequenas variações de cor, flor ou posição podem acontecer — elas são a assinatura da peça.</p><Link className="button button-light" to="/loja">Conhecer as criações <ArrowIcon /></Link></div></section>
    </>
  )
}
