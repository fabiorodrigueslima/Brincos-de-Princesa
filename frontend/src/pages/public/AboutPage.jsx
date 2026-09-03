import { Link } from "react-router-dom";
import {
  ArrowIcon,
  HeartIcon,
  LeafIcon,
  SparkleIcon,
} from "../../components/common/Icons.jsx";
import { PageHero } from "../../components/common/PageHero.jsx";
import { PageMeta } from "../../components/common/PageMeta.jsx";

export function AboutPage() {
  return (
    <>
      <PageMeta
        title="Nossa história"
        description="Conheça a Brinco de Princesa, marca de biojoias em cerâmica guiada pelo fazer manual, pela matéria e pela expressão autoral."
      />
      <PageHero
        eyebrow="Nossa história"
        title="Transformar matéria em expressão."
        text="A Brinco de Princesa é uma marca artesanal em evolução, criada para dar forma a peças que carregam presença, identidade e o gesto de quem faz."
      />
      <section className="split-section container">
        <img
          src="/images/processo-artesanal-novo.png"
          alt="Artesã trabalhando manualmente em uma peça, em fotografia provisória"
          loading="lazy"
          width="1122"
          height="1402"
        />
        <div>
          <p className="eyebrow">A marca</p>
          <h2>O valor está no caminho de cada peça.</h2>
          <p>
            A criação manual aproxima ideia, matéria e tempo. Em pequenas
            produções, cada etapa recebe atenção para que formas, texturas e
            acabamentos encontrem uma identidade própria.
          </p>
          <p>
            A cerâmica ocupa o centro desse novo momento da Brinco de Princesa:
            um material que convida ao toque, registra o gesto e se transforma
            ao longo do processo artesanal.
          </p>
          <p>
            Esta narrativa institucional será ampliada quando a história pessoal
            e a trajetória da artesã forem compartilhadas pela cliente.
          </p>
        </div>
      </section>
      <section className="section soft-section">
        <div className="container">
          <div className="principles-grid">
            <article>
              <LeafIcon />
              <h3>Matéria presente</h3>
              <p>
                A argila e suas texturas participam da linguagem de cada
                criação.
              </p>
            </article>
            <article>
              <HeartIcon />
              <h3>Feito com cuidado</h3>
              <p>
                Pequenas produções permitem acompanhar cada peça com atenção.
              </p>
            </article>
            <article>
              <SparkleIcon />
              <h3>Expressão singular</h3>
              <p>
                Variações do fazer manual tornam cada biojoia naturalmente
                única.
              </p>
            </article>
          </div>
        </div>
      </section>
      <section className="quote-section container narrow">
        <blockquote>
          “Toda peça começa como possibilidade nas mãos de quem cria.”
        </blockquote>
        <p>
          Entre matéria, tempo e transformação, nasce uma joia com presença
          própria.
        </p>
        <Link className="text-link" to="/como-e-feito">
          Conheça o processo <ArrowIcon />
        </Link>
      </section>
    </>
  );
}
