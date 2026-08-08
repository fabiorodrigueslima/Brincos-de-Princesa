\set ON_ERROR_STOP on
\connect brinco_de_princesa

SET ROLE brinco_owner;
SET search_path = app, public;

-- Apenas dados públicos e não sensíveis. Nenhum administrador ou segredo é criado por seed.
INSERT INTO categorias (nome, slug, descricao, ordem)
VALUES
  ('Brincos', 'brincos', 'Brincos artesanais e peças autorais.', 10),
  ('Resina', 'resina', 'Peças confeccionadas artesanalmente com resina.', 20),
  ('Florais', 'florais', 'Peças inspiradas em flores e elementos botânicos.', 30),
  ('Personalizados', 'personalizados', 'Criações desenvolvidas sob encomenda.', 40)
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  ordem = EXCLUDED.ordem,
  ativa = TRUE;

INSERT INTO configuracoes (chave, valor, descricao, publica)
VALUES
  ('store.currency', '"BRL"'::jsonb, 'Moeda utilizada pela loja.', TRUE),
  ('store.locale', '"pt-BR"'::jsonb, 'Localidade padrão da loja.', TRUE),
  ('checkout.enabled', 'false'::jsonb, 'Checkout permanece desativado até pagamento e frete serem configurados.', FALSE),
  ('inventory.low_stock_threshold', '3'::jsonb, 'Limite padrão para alerta de estoque baixo.', FALSE)
ON CONFLICT (chave) DO NOTHING;

RESET ROLE;
