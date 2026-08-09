-- BASELINE DO SCHEMA APROVADO EM 08/08/2026.
-- Esta migration não cria nem recria as 26 tabelas de negócio.
-- Ela valida o banco existente antes de registrar o início do histórico incremental.

DO $$
DECLARE
  expected_tables TEXT[] := ARRAY[
    'audit_logs', 'banners', 'categorias', 'clientes', 'colecoes', 'configuracoes',
    'cupom_categorias', 'cupom_produtos', 'cupom_utilizacoes', 'cupons', 'enderecos',
    'idempotency_keys', 'movimentos_estoque', 'pagamentos', 'password_reset_tokens',
    'pedido_itens', 'pedido_status_historico', 'pedidos', 'produto_colecoes',
    'produto_imagens', 'produto_variantes', 'produtos', 'reservas_estoque', 'sessoes',
    'usuarios_admin', 'webhook_eventos'
  ];
  actual_tables TEXT[];
  business_indexes INTEGER;
  business_triggers INTEGER;
BEGIN
  SELECT array_agg(table_name ORDER BY table_name)
    INTO actual_tables
    FROM information_schema.tables
   WHERE table_schema = 'app'
     AND table_type = 'BASE TABLE'
     AND table_name <> 'schema_migrations';

  IF actual_tables IS DISTINCT FROM expected_tables THEN
    RAISE EXCEPTION 'Baseline recusada: conjunto de tabelas de negócio divergente';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM (VALUES
        ('categorias', 'id', 'int8'), ('categorias', 'slug', 'varchar'),
        ('colecoes', 'id', 'int8'), ('colecoes', 'slug', 'varchar'),
        ('produtos', 'id', 'int8'), ('produtos', 'categoria_id', 'int8'),
        ('produtos', 'slug', 'varchar'), ('produtos', 'status', 'varchar'),
        ('produto_variantes', 'id', 'int8'), ('produto_variantes', 'produto_id', 'int8'),
        ('produto_variantes', 'sku', 'varchar'), ('produto_variantes', 'preco', 'numeric'),
        ('produto_variantes', 'estoque', 'int2'), ('produto_variantes', 'estoque_reservado', 'int2'),
        ('produto_imagens', 'id', 'int8'), ('produto_imagens', 'produto_id', 'int8'),
        ('produto_imagens', 'url', 'text'), ('produto_imagens', 'alt_text', 'varchar'),
        ('produto_imagens', 'principal', 'bool'),
        ('produto_colecoes', 'produto_id', 'int8'), ('produto_colecoes', 'colecao_id', 'int8')
      ) AS required(table_name, column_name, udt_name)
     WHERE NOT EXISTS (
       SELECT 1
         FROM information_schema.columns c
        WHERE c.table_schema = 'app'
          AND c.table_name = required.table_name
          AND c.column_name = required.column_name
          AND c.udt_name = required.udt_name
     )
  ) THEN
    RAISE EXCEPTION 'Baseline recusada: coluna essencial do catálogo ausente ou incompatível';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'app.produto_variantes'::regclass
       AND contype = 'u'
       AND conname = 'produto_variantes_sku_key'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'app.produto_variantes'::regclass
       AND conname = 'produto_variantes_estoque_check'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'app.produto_variantes'::regclass
       AND conname = 'variantes_reserva_valida'
  ) OR to_regclass('app.produto_imagens_uma_principal_uk') IS NULL THEN
    RAISE EXCEPTION 'Baseline recusada: constraints essenciais de variante, estoque ou imagem ausentes';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'app'
       AND column_name IN ('preco', 'preco_promocional', 'valor', 'subtotal', 'total', 'frete', 'desconto')
       AND data_type IN ('real', 'double precision')
  ) THEN
    RAISE EXCEPTION 'Baseline recusada: valor monetário com tipo de ponto flutuante';
  END IF;

  SELECT count(*) INTO business_indexes
    FROM pg_indexes
   WHERE schemaname = 'app' AND tablename <> 'schema_migrations';

  SELECT count(*) INTO business_triggers
    FROM information_schema.triggers
   WHERE trigger_schema = 'app' AND event_object_table <> 'schema_migrations';

  IF business_indexes <> 68 OR business_triggers <> 13 THEN
    RAISE EXCEPTION 'Baseline recusada: esperados 68 índices e 13 triggers de negócio; encontrados % e %', business_indexes, business_triggers;
  END IF;

  IF to_regprocedure('app.set_atualizado_em()') IS NULL THEN
    RAISE EXCEPTION 'Baseline recusada: função app.set_atualizado_em ausente';
  END IF;
END;
$$;
