-- DADOS DE DESENVOLVIMENTO. Não representam oferta comercial.
-- Idempotente e recusado pelo runner em produção e no banco de testes.
SET search_path = app, public;

INSERT INTO categorias (nome, slug, descricao, ativa, ordem)
VALUES
  ('Brincos', 'brincos', 'Brincos artesanais e peças autorais.', TRUE, 10),
  ('Anéis', 'aneis', 'Anéis artesanais e peças autorais.', TRUE, 20),
  ('Colares', 'colares', 'Colares artesanais e peças autorais.', TRUE, 30),
  ('Pulseiras', 'pulseiras', 'Pulseiras artesanais e peças autorais.', TRUE, 40)
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, ativa=TRUE, ordem=EXCLUDED.ordem;

INSERT INTO colecoes (nome, slug, descricao, imagem_url, ativa, destaque, publicada_em)
VALUES ('Demonstração', 'demonstracao', 'DADOS DE DESENVOLVIMENTO — coleção técnica sem valor comercial.', '/images/colecao-brincos-florais.png', TRUE, TRUE, COALESCE((SELECT publicada_em FROM colecoes WHERE slug='demonstracao'), now()))
ON CONFLICT (slug) DO UPDATE SET nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, imagem_url=EXCLUDED.imagem_url, ativa=TRUE, destaque=TRUE, publicada_em=COALESCE(colecoes.publicada_em, EXCLUDED.publicada_em);

INSERT INTO produtos (categoria_id,nome,slug,descricao,materiais,medidas,cuidados,prazo_producao_dias,status,destaque,novidade,meta_title,meta_description,publicado_em)
VALUES
  ((SELECT id FROM categorias WHERE slug='brincos'),'Brinco Floral em Resina','brinco-floral-em-resina-demo','DADOS DE DESENVOLVIMENTO — Produto demonstrativo para desenvolvimento e testes.','Resina e metal — composição demonstrativa','4 cm — medida demonstrativa','Evitar contato com água, perfumes e produtos químicos.',3,'ACTIVE',TRUE,TRUE,'Brinco demonstrativo','Produto demonstrativo do catálogo.',COALESCE((SELECT publicado_em FROM produtos WHERE slug='brinco-floral-em-resina-demo'),now())),
  ((SELECT id FROM categorias WHERE slug='aneis'),'Anel Textura Demo','anel-textura-demo','DADOS DE DESENVOLVIMENTO — Produto demonstrativo sem oferta comercial.','Material demonstrativo','Medida demonstrativa','Cuidados a confirmar.',0,'ACTIVE',FALSE,FALSE,'Anel demonstrativo','Dado exclusivo de desenvolvimento.',COALESCE((SELECT publicado_em FROM produtos WHERE slug='anel-textura-demo'),now()-interval '3 days')),
  ((SELECT id FROM categorias WHERE slug='colares'),'Colar Forma Demo','colar-forma-demo','DADOS DE DESENVOLVIMENTO — Produto demonstrativo sem oferta comercial.','Material demonstrativo','Medida demonstrativa','Cuidados a confirmar.',0,'ACTIVE',FALSE,FALSE,'Colar demonstrativo','Dado exclusivo de desenvolvimento.',COALESCE((SELECT publicado_em FROM produtos WHERE slug='colar-forma-demo'),now()-interval '6 days')),
  ((SELECT id FROM categorias WHERE slug='pulseiras'),'Pulseira Gesto Demo','pulseira-gesto-demo','DADOS DE DESENVOLVIMENTO — Produto demonstrativo sem oferta comercial.','Material demonstrativo','Medida demonstrativa','Cuidados a confirmar.',0,'ACTIVE',FALSE,FALSE,'Pulseira demonstrativa','Dado exclusivo de desenvolvimento.',COALESCE((SELECT publicado_em FROM produtos WHERE slug='pulseira-gesto-demo'),now()-interval '9 days'))
ON CONFLICT (slug) DO UPDATE SET categoria_id=EXCLUDED.categoria_id,nome=EXCLUDED.nome,descricao=EXCLUDED.descricao,materiais=EXCLUDED.materiais,medidas=EXCLUDED.medidas,cuidados=EXCLUDED.cuidados,prazo_producao_dias=EXCLUDED.prazo_producao_dias,status='ACTIVE',destaque=EXCLUDED.destaque,novidade=EXCLUDED.novidade,meta_title=EXCLUDED.meta_title,meta_description=EXCLUDED.meta_description,publicado_em=COALESCE(produtos.publicado_em,EXCLUDED.publicado_em);

INSERT INTO produto_variantes (produto_id,sku,nome,atributos,preco,preco_promocional,estoque,estoque_reservado,ativa)
VALUES
  ((SELECT id FROM produtos WHERE slug='brinco-floral-em-resina-demo'),'DEV-BFR-ROSA','Rosa','{"cor":"rosa"}',89.90,69.90,3,0,TRUE),
  ((SELECT id FROM produtos WHERE slug='brinco-floral-em-resina-demo'),'DEV-BFR-AZUL','Azul','{"cor":"azul"}',92.90,NULL,2,0,TRUE),
  ((SELECT id FROM produtos WHERE slug='brinco-floral-em-resina-demo'),'DEV-BFR-BRANCO','Branco','{"cor":"branco"}',89.90,NULL,1,0,TRUE),
  ((SELECT id FROM produtos WHERE slug='anel-textura-demo'),'DEV-ANEL-UNICO','Único','{}',79.90,NULL,4,0,TRUE),
  ((SELECT id FROM produtos WHERE slug='colar-forma-demo'),'DEV-COLAR-UNICO','Único','{}',139.90,NULL,2,0,TRUE),
  ((SELECT id FROM produtos WHERE slug='pulseira-gesto-demo'),'DEV-PULSEIRA-UNICA','Única','{}',99.90,NULL,0,0,TRUE)
ON CONFLICT (sku) DO UPDATE SET produto_id=EXCLUDED.produto_id,nome=EXCLUDED.nome,atributos=EXCLUDED.atributos,preco=EXCLUDED.preco,preco_promocional=EXCLUDED.preco_promocional,estoque=EXCLUDED.estoque,estoque_reservado=0,ativa=TRUE;

-- Uma imagem por produto, com URLs locais já existentes. A associação é idempotente.
WITH image_data(slug,url,alt_text,ordem) AS (VALUES
  ('brinco-floral-em-resina-demo','/images/brinco-floral-rosa.png','Brincos de resina com flores — imagem demonstrativa',0),
  ('anel-textura-demo','/images/brinco-folha-clara.png','Imagem artesanal provisória para demonstrar o card de anel',0),
  ('colar-forma-demo','/images/brinco-folha-dourada.png','Imagem artesanal provisória para demonstrar o card de colar',0),
  ('pulseira-gesto-demo','/images/brinco-folha-terracota.png','Imagem artesanal provisória para demonstrar o card de pulseira',0)
)
INSERT INTO produto_imagens (produto_id,url,alt_text,mime_type,ordem,principal)
SELECT p.id,d.url,d.alt_text,'image/png',d.ordem,TRUE FROM image_data d JOIN produtos p ON p.slug=d.slug
WHERE NOT EXISTS (SELECT 1 FROM produto_imagens i WHERE i.produto_id=p.id AND i.url=d.url);

-- Preserva a segunda imagem histórica do brinco demo.
INSERT INTO produto_imagens (produto_id,url,alt_text,mime_type,ordem,principal)
SELECT id,'/images/colecao-brincos-florais.png','Coleção de brincos de resina — imagem demonstrativa','image/png',1,FALSE FROM produtos p
WHERE slug='brinco-floral-em-resina-demo' AND NOT EXISTS (SELECT 1 FROM produto_imagens i WHERE i.produto_id=p.id AND i.url='/images/colecao-brincos-florais.png');

-- Garante uma única imagem principal por produto sem excluir imagens existentes.
WITH ranked AS (SELECT id,produto_id,row_number() OVER (PARTITION BY produto_id ORDER BY principal DESC,ordem,id) rn FROM produto_imagens WHERE produto_id IN (SELECT id FROM produtos WHERE slug LIKE '%-demo'))
UPDATE produto_imagens i SET principal=(ranked.rn=1) FROM ranked WHERE i.id=ranked.id;

INSERT INTO produto_colecoes (produto_id,colecao_id,ordem)
SELECT p.id,c.id,0 FROM produtos p CROSS JOIN colecoes c WHERE p.slug IN ('brinco-floral-em-resina-demo','anel-textura-demo','colar-forma-demo') AND c.slug='demonstracao'
ON CONFLICT (produto_id,colecao_id) DO UPDATE SET ordem=EXCLUDED.ordem;
