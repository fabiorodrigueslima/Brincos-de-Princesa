import { Link } from "react-router-dom";
import { ArrowIcon } from "../../components/common/Icons.jsx";
import { PageHero } from "../../components/common/PageHero.jsx";
import { PageMeta } from "../../components/common/PageMeta.jsx";

export function PersonalizadosPage() {
  return (
    <>
      <PageMeta
        title="Personalizados"
        description="Ideias, memórias e intenções podem inspirar uma peça artesanal personalizada."
      />
      <PageHero
        eyebrow="Personalizados"
        title="Uma intenção transformada em peça."
        text="Ideias, memórias e referências afetivas podem inspirar uma criação desenvolvida em conversa com você."
      />
      <section className="split-section container personalized-intro">
        <div>
          <p className="eyebrow">Criação em conversa</p>
          <h2>Uma peça única começa com uma boa escuta.</h2>
          <p>
            O processo personalizado considera o estilo desejado, a
            disponibilidade de materiais e o tempo artesanal necessário. Antes
            de produzir, alinhamos possibilidades, formato, paleta e prazo.
          </p>
          <p>
            O serviço ainda está sendo preparado para atendimento online. Nenhum
            pedido ou pagamento é realizado por esta página neste momento.
          </p>
        </div>
        <img
          src="/images/brinco-folha-dourada.png"
          alt="Composição de brincos artesanais usada como referência visual provisória"
          loading="lazy"
          width="1145"
          height="1374"
        />
      </section>
      <section className="section soft-section">
        <div className="container">
          <div className="custom-steps">
            <article>
              <span>1</span>
              <h3>Conte sua ideia</h3>
              <p>
                Compartilhe referências, intenção e o que tornaria a peça
                especial para você.
              </p>
            </article>
            <article>
              <span>2</span>
              <h3>Alinhamos possibilidades</h3>
              <p>
                Avaliamos materiais, formato, prazo e orçamento antes de
                começar.
              </p>
            </article>
            <article>
              <span>3</span>
              <h3>Criamos à mão</h3>
              <p>
                A produção acontece com acompanhamento e aprovação conforme
                combinado.
              </p>
            </article>
          </div>
        </div>
      </section>
      <section className="quote-section container narrow">
        <p className="eyebrow">Em breve</p>
        <h2>
          O atendimento para personalizados será aberto quando o canal oficial
          estiver configurado.
        </h2>
        <p>
          Assim evitamos receber dados ou promessas de pedido por um fluxo ainda
          incompleto.
        </p>
        <Link className="button button-primary" to="/contato">
          Ver canais de contato <ArrowIcon />
        </Link>
      </section>
    </>
  );
}
