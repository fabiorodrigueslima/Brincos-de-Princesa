import { Link } from "react-router-dom";
import { ArrowIcon } from "../../components/common/Icons.jsx";
import { PageHero } from "../../components/common/PageHero.jsx";
import { PageMeta } from "../../components/common/PageMeta.jsx";

const steps = [
  [
    "01",
    "Inspiração",
    "Formas, texturas e referências dão início ao caminho de uma nova peça.",
  ],
  [
    "02",
    "Modelagem",
    "A matéria ganha forma pelas mãos, em um processo atento e intencional.",
  ],
  [
    "03",
    "Secagem",
    "O tempo participa do fazer e prepara a peça para as próximas transformações.",
  ],
  [
    "04",
    "Queima",
    "O encontro com o fogo transforma a matéria e consolida sua nova forma.",
  ],
  [
    "05",
    "Acabamento",
    "Superfícies, contornos e detalhes recebem cuidado antes da montagem.",
  ],
  [
    "06",
    "Montagem",
    "A parte cerâmica encontra os componentes que completam a biojoia.",
  ],
  [
    "07",
    "Peça final",
    "Cada criação é observada em seus detalhes antes de seguir adiante.",
  ],
];

export function ProcessPage() {
  return (
    <>
      <PageMeta
        title="Como é feito"
        description="Da matéria à biojoia: conheça o processo artesanal das peças em cerâmica da Brinco de Princesa."
      />
      <PageHero
        eyebrow="Processo artesanal"
        title="Da matéria à biojoia."
        text="Mãos, tempo e fogo acompanham a transformação da argila em uma peça com presença própria."
      />
      <section className="process-story container">
        <div className="process-sticky">
          <img
            src="/images/processo-artesanal-novo.png"
            alt="Artesã trabalhando manualmente em uma peça, em fotografia provisória"
            width="1122"
            height="1402"
          />
          <p>
            Imagem provisória. O registro oficial do processo em cerâmica será
            incluído após a sessão fotográfica.
          </p>
        </div>
        <ol className="process-details">
          {steps.map(([number, title, text]) => (
            <li key={number}>
              <span>{number}</span>
              <div>
                <h2>{title}</h2>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <aside className="process-review-note container narrow">
        <strong>Processo em revisão</strong>
        <p>
          Estas etapas apresentam uma visão conceitual e serão ajustadas com a
          artesã para refletir as técnicas adotadas em cada coleção.
        </p>
      </aside>
      <section className="care-banner">
        <div className="container narrow">
          <p className="eyebrow">O caráter artesanal</p>
          <h2>Variações também contam uma história.</h2>
          <p>
            Pequenas diferenças de cor, textura, desenho ou acabamento podem
            surgir no fazer manual e fazem parte da singularidade de cada peça.
          </p>
          <Link className="button button-light" to="/loja">
            Conhecer as biojoias <ArrowIcon />
          </Link>
        </div>
      </section>
    </>
  );
}
