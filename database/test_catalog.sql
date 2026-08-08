\set ON_ERROR_STOP on
\connect brinco_de_princesa

SET ROLE brinco_owner;
SET search_path = app, public;

INSERT INTO colecoes (nome, slug, descricao, ativa, destaque, publicada_em)
VALUES ('Coleção de Verificação', 'colecao-verificacao', 'Dados exclusivos da instância temporária de testes.', TRUE, TRUE, now())
ON CONFLICT (slug) DO UPDATE SET ativa = TRUE
RETURNING id AS test_collection_id
\gset

INSERT INTO produtos (
  categoria_id, nome, slug, descricao, materiais, medidas, cuidados,
  prazo_producao_dias, status, destaque, novidade, publicado_em
)
VALUES (
  (SELECT id FROM categorias WHERE slug = 'brincos'),
  'Brinco Floral de Verificação', 'brinco-floral-verificacao',
  'Produto criado apenas no PostgreSQL temporário para validar o catálogo.',
  'Resina e metal', '4 cm', 'Evitar contato com produtos químicos.',
  3, 'ACTIVE', TRUE, TRUE, now()
)
RETURNING id AS test_product_id
\gset

INSERT INTO produto_variantes (produto_id, sku, nome, atributos, preco, preco_promocional, estoque)
VALUES
  (:test_product_id, 'TEST-FLORAL-VINHO', 'Vinho', '{"cor":"vinho"}', 129.90, 109.90, 5),
  (:test_product_id, 'TEST-FLORAL-MARFIM', 'Marfim', '{"cor":"marfim"}', 119.90, NULL, 0);

INSERT INTO produto_imagens (produto_id, url, alt_text, principal, ordem)
VALUES (:test_product_id, '/images/hero-artesanal.webp', 'Brinco floral de verificação', TRUE, 0);

INSERT INTO produto_colecoes (produto_id, colecao_id)
VALUES (:test_product_id, :test_collection_id);

RESET ROLE;
