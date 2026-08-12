-- Categorias passam a representar o tipo da peça. Materiais e estilos históricos
-- são preservados, mas deixam de ser categorias públicas comerciais.
INSERT INTO app.categorias (nome, slug, descricao, ativa, ordem)
VALUES
  ('Brincos', 'brincos', 'Brincos artesanais e peças autorais.', TRUE, 10),
  ('Anéis', 'aneis', 'Anéis artesanais e peças autorais.', TRUE, 20),
  ('Colares', 'colares', 'Colares artesanais e peças autorais.', TRUE, 30),
  ('Pulseiras', 'pulseiras', 'Pulseiras artesanais e peças autorais.', TRUE, 40)
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  ativa = TRUE,
  ordem = EXCLUDED.ordem;

-- Este produto de desenvolvimento é inequivocamente um brinco. A composição
-- em resina permanece em produtos.materiais e nenhum dado de variante muda.
UPDATE app.produtos
   SET categoria_id = (SELECT id FROM app.categorias WHERE slug = 'brincos')
 WHERE slug = 'brinco-floral-em-resina-demo'
   AND categoria_id IN (
     SELECT id FROM app.categorias WHERE slug IN ('resina', 'florais')
   );

-- Registros históricos não são excluídos. Apenas deixam a taxonomia pública;
-- produtos não reconhecidos continuam vinculados a seus IDs originais.
UPDATE app.categorias
   SET ativa = FALSE,
       atualizado_em = now()
 WHERE slug IN ('resina', 'florais', 'personalizados');
