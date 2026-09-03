import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowIcon } from "../../components/common/Icons.jsx";
import { PageHero } from "../../components/common/PageHero.jsx";
import { PageMeta } from "../../components/common/PageMeta.jsx";
import { getCollections } from "../../services/api.js";

export function CollectionsPage() {
  const [collections, setCollections] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    getCollections(controller.signal)
      .then((response) =>
        setCollections(
          response.data.filter(
            (collection) => !collection.slug.includes("demonstr"),
          ),
        ),
      )
      .catch((reason) => {
        if (reason.name !== "AbortError") setCollections([]);
      });
    return () => controller.abort();
  }, []);

  return (
    <>
      <PageMeta
        title="Coleções autorais"
        description="Conheça as coleções de biojoias artesanais da Brinco de Princesa."
      />
      <PageHero
        eyebrow="Coleções autorais"
        title="Pequenas séries, identidades próprias."
        text="Formas, texturas e referências se encontram em coleções criadas com tempo e intenção."
      />
      {collections.length > 0 ? (
        <section className="section container">
          <div className="collection-api-grid">
            {collections.map((collection) => (
              <article key={collection.id}>
                {collection.imageUrl && (
                  <img src={collection.imageUrl} alt="" loading="lazy" />
                )}
                <div>
                  <p className="eyebrow">Coleção</p>
                  <h2>{collection.name}</h2>
                  {collection.description && <p>{collection.description}</p>}
                  <Link className="text-link" to="/loja">
                    Ver peças <ArrowIcon />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="collections-empty container narrow">
          <p className="eyebrow">Em preparação</p>
          <h2>As próximas coleções serão apresentadas aqui.</h2>
          <p>
            Esta página está conectada à estrutura real do catálogo e não exibe
            nomes ou lançamentos fictícios. Quando uma coleção for publicada,
            ela ganhará espaço neste percurso.
          </p>
          <Link className="button button-primary" to="/loja">
            Conhecer o catálogo
          </Link>
        </section>
      )}
      <section className="closing-cta">
        <div className="container narrow">
          <p className="eyebrow">Criação em movimento</p>
          <h2>Matéria, gesto e inspiração encontram novas formas.</h2>
          <Link className="button button-light" to="/como-e-feito">
            Conheça o processo
          </Link>
        </div>
      </section>
    </>
  );
}
