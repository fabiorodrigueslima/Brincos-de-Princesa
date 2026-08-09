\set ON_ERROR_STOP on
\connect brinco_de_princesa

SET search_path = app, public;
BEGIN;

DO $$
DECLARE
  total_tabelas_negocio INTEGER;
  produto_teste_id BIGINT;
BEGIN
  SELECT count(*)
    INTO total_tabelas_negocio
    FROM information_schema.tables
   WHERE table_schema = 'app'
     AND table_name <> 'schema_migrations';

  IF total_tabelas_negocio <> 26 THEN
    RAISE EXCEPTION 'Esperadas 26 tabelas de negócio no schema app; encontradas %', total_tabelas_negocio;
  END IF;

  IF to_regclass('app.schema_migrations') IS NULL THEN
    RAISE EXCEPTION 'A tabela de controle app.schema_migrations não foi encontrada';
  END IF;

  INSERT INTO produtos (nome, slug, descricao)
  VALUES ('Produto temporário', 'produto-temporario-verificacao', 'Usado somente dentro de uma transação revertida.')
  RETURNING id INTO produto_teste_id;

  BEGIN
    INSERT INTO produto_variantes (produto_id, sku, nome, preco, estoque)
    VALUES (produto_teste_id, 'VERIFY-NEGATIVE-STOCK', 'Teste', 10.00, -1);
    RAISE EXCEPTION 'A constraint permitiu estoque negativo';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  BEGIN
    INSERT INTO cupons (codigo, tipo, valor)
    VALUES ('VERIFY-INVALID-PERCENT', 'PERCENT', 101.00);
    RAISE EXCEPTION 'A constraint permitiu percentual maior que 100';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  BEGIN
    INSERT INTO pedidos (
      codigo_publico, access_token_hash, email_cliente, nome_cliente,
      endereco_entrega, subtotal, desconto, frete, total
    ) VALUES (
      'VERIFY-INVALID-TOTAL', repeat('a', 64), 'teste@example.com', 'Teste',
      '{"cep":"00000000"}'::jsonb, 100.00, 0.00, 0.00, 1.00
    );
    RAISE EXCEPTION 'A constraint permitiu total adulterado';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
END;
$$;

SET LOCAL ROLE brinco_app;

DO $$
BEGIN
  PERFORM count(*) FROM categorias;
  PERFORM count(*) FROM colecoes;
  PERFORM count(*) FROM produtos;
  PERFORM count(*) FROM produto_variantes;
  PERFORM count(*) FROM produto_imagens;
  PERFORM count(*) FROM produto_colecoes;

  IF has_database_privilege(current_user, current_database(), 'TEMP') THEN
    RAISE EXCEPTION 'O papel da aplicação ainda possui TEMP no banco';
  END IF;

  IF has_table_privilege(current_user, 'app.usuarios_admin', 'SELECT')
     OR has_table_privilege(current_user, 'app.usuarios_admin', 'DELETE')
     OR has_table_privilege(current_user, 'app.sessoes', 'DELETE')
     OR has_table_privilege(current_user, 'app.pedidos', 'UPDATE')
     OR has_table_privilege(current_user, 'app.pagamentos', 'UPDATE') THEN
    RAISE EXCEPTION 'O papel da aplicação ainda possui privilégio sensível';
  END IF;

  IF has_sequence_privilege(current_user, 'app.categorias_id_seq', 'USAGE') THEN
    RAISE EXCEPTION 'O papel da aplicação ainda possui acesso a sequências';
  END IF;

  IF has_function_privilege(current_user, 'app.set_atualizado_em()', 'EXECUTE') THEN
    RAISE EXCEPTION 'O papel da aplicação ainda pode executar funções internas';
  END IF;
END;
$$;

RESET ROLE;
ROLLBACK;

\echo 'Verificação concluída: estrutura, constraints e menor privilégio do catálogo aprovados.'
