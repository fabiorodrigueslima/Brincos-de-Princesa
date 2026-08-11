-- DADOS DE DESENVOLVIMENTO.
-- Produto, preços, estoque e imagens abaixo são demonstrativos e não representam oferta comercial.
-- Este arquivo é idempotente e é recusado pelo runner em produção e no banco de testes.

SET search_path = app, public;

INSERT INTO categorias (nome, slug, descricao, ativa, ordem)
VALUES ('Brincos', 'brincos', 'Brincos artesanais e peças autorais.', TRUE, 10)
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  ativa = TRUE,
  ordem = EXCLUDED.ordem;

INSERT INTO colecoes (nome, slug, descricao, ativa, destaque, publicada_em)
VALUES (
  'Demonstração',
  'demonstracao',
  'Coleção exclusiva de desenvolvimento. Não representa uma coleção comercial oficial.',
  TRUE,
  FALSE,
  now()
)
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  ativa = TRUE,
  destaque = FALSE,
  publicada_em = COALESCE(colecoes.publicada_em, EXCLUDED.publicada_em);

INSERT INTO produtos (
  categoria_id, nome, slug, descricao, materiais, medidas, cuidados,
  prazo_producao_dias, status, destaque, novidade, meta_title,
  meta_description, publicado_em
)
VALUES (
  (SELECT id FROM categorias WHERE slug = 'brincos'),
  'Brinco Floral em Resina',
  'brinco-floral-em-resina-demo',
  'DADOS DE DESENVOLVIMENTO — Produto demonstrativo para desenvolvimento e testes.',
  'Resina e metal — composição demonstrativa',
  '4 cm — medida demonstrativa',
  'Evitar contato com água, perfumes e produtos químicos.',
  3,
  'ACTIVE',
  TRUE,
  TRUE,
  'Brinco Floral em Resina — demonstração',
  'Produto demonstrativo do catálogo Brinco de Princesa.',
  now()
)
ON CONFLICT (slug) DO UPDATE SET
  categoria_id = EXCLUDED.categoria_id,
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  materiais = EXCLUDED.materiais,
  medidas = EXCLUDED.medidas,
  cuidados = EXCLUDED.cuidados,
  prazo_producao_dias = EXCLUDED.prazo_producao_dias,
  status = 'ACTIVE',
  destaque = TRUE,
  novidade = TRUE,
  meta_title = EXCLUDED.meta_title,
  meta_description = EXCLUDED.meta_description,
  publicado_em = COALESCE(produtos.publicado_em, EXCLUDED.publicado_em);

INSERT INTO produto_variantes (produto_id, sku, nome, atributos, preco, estoque, estoque_reservado, ativa)
VALUES
  ((SELECT id FROM produtos WHERE slug = 'brinco-floral-em-resina-demo'), 'DEV-BFR-ROSA', 'Rosa', '{"cor":"rosa"}', 89.90, 3, 0, TRUE),
  ((SELECT id FROM produtos WHERE slug = 'brinco-floral-em-resina-demo'), 'DEV-BFR-AZUL', 'Azul', '{"cor":"azul"}', 92.90, 2, 0, TRUE),
  ((SELECT id FROM produtos WHERE slug = 'brinco-floral-em-resina-demo'), 'DEV-BFR-BRANCO', 'Branco', '{"cor":"branco"}', 89.90, 1, 0, TRUE)
ON CONFLICT (sku) DO UPDATE SET
  produto_id = EXCLUDED.produto_id,
  nome = EXCLUDED.nome,
  atributos = EXCLUDED.atributos,
  preco = EXCLUDED.preco,
  preco_promocional = NULL,
  estoque = EXCLUDED.estoque,
  estoque_reservado = 0,
  ativa = TRUE;

UPDATE produto_imagens
   SET principal = FALSE
 WHERE produto_id = (SELECT id FROM produtos WHERE slug = 'brinco-floral-em-resina-demo');

UPDATE produto_imagens
   SET url = '/images/brinco-floral-rosa.png',
       alt_text = 'Par de brincos artesanais de resina transparente com pequenas flores rosas',
       mime_type = 'image/png', largura_px = 1536, altura_px = 1024, ordem = 0, principal = TRUE
 WHERE produto_id = (SELECT id FROM produtos WHERE slug = 'brinco-floral-em-resina-demo')
   AND url = '/images/hero-artesanal.webp';

UPDATE produto_imagens
   SET alt_text = 'Par de brincos artesanais de resina transparente com pequenas flores rosas',
       mime_type = 'image/png', largura_px = 1536, altura_px = 1024, ordem = 0, principal = TRUE
 WHERE produto_id = (SELECT id FROM produtos WHERE slug = 'brinco-floral-em-resina-demo')
   AND url = '/images/brinco-floral-rosa.png';

INSERT INTO produto_imagens (
  produto_id, url, alt_text, mime_type, ordem, principal
)
SELECT id, '/images/brinco-floral-rosa.png',
       'Par de brincos artesanais de resina transparente com pequenas flores rosas',
       'image/png', 0, TRUE
  FROM produtos
 WHERE slug = 'brinco-floral-em-resina-demo'
   AND NOT EXISTS (
     SELECT 1 FROM produto_imagens
      WHERE produto_id = produtos.id AND url = '/images/brinco-floral-rosa.png'
   );

UPDATE produto_imagens
   SET url = '/images/colecao-brincos-florais.png',
       alt_text = 'Coleção de brincos artesanais de resina com flores preservadas',
       mime_type = 'image/png', largura_px = 1254, altura_px = 1254, ordem = 1, principal = FALSE
 WHERE produto_id = (SELECT id FROM produtos WHERE slug = 'brinco-floral-em-resina-demo')
   AND url = '/images/processo-artesanal.webp';

UPDATE produto_imagens
   SET alt_text = 'Coleção de brincos artesanais de resina com flores preservadas',
       mime_type = 'image/png', largura_px = 1254, altura_px = 1254, ordem = 1, principal = FALSE
 WHERE produto_id = (SELECT id FROM produtos WHERE slug = 'brinco-floral-em-resina-demo')
   AND url = '/images/colecao-brincos-florais.png';

INSERT INTO produto_imagens (
  produto_id, url, alt_text, mime_type, ordem, principal
)
SELECT id, '/images/colecao-brincos-florais.png',
       'Coleção de brincos artesanais de resina com flores preservadas',
       'image/png', 1, FALSE
  FROM produtos
 WHERE slug = 'brinco-floral-em-resina-demo'
   AND NOT EXISTS (
     SELECT 1 FROM produto_imagens
      WHERE produto_id = produtos.id AND url = '/images/colecao-brincos-florais.png'
   );

INSERT INTO produto_colecoes (produto_id, colecao_id, ordem)
VALUES (
  (SELECT id FROM produtos WHERE slug = 'brinco-floral-em-resina-demo'),
  (SELECT id FROM colecoes WHERE slug = 'demonstracao'),
  0
)
ON CONFLICT (produto_id, colecao_id) DO UPDATE SET ordem = EXCLUDED.ordem;
