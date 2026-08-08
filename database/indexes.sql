\set ON_ERROR_STOP on
\connect brinco_de_princesa

SET ROLE brinco_owner;
SET search_path = app, public;

CREATE UNIQUE INDEX IF NOT EXISTS usuarios_admin_email_lower_uk
  ON usuarios_admin (lower(email));

CREATE UNIQUE INDEX IF NOT EXISTS clientes_email_lower_uk
  ON clientes (lower(email));

CREATE UNIQUE INDEX IF NOT EXISTS cupons_codigo_upper_uk
  ON cupons (upper(codigo));

CREATE UNIQUE INDEX IF NOT EXISTS enderecos_um_principal_por_cliente_uk
  ON enderecos (cliente_id)
  WHERE principal = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS produto_imagens_uma_principal_uk
  ON produto_imagens (produto_id)
  WHERE principal = TRUE;

CREATE INDEX IF NOT EXISTS produtos_categoria_status_idx
  ON produtos (categoria_id, status);

CREATE INDEX IF NOT EXISTS produtos_publicacao_idx
  ON produtos (publicado_em DESC)
  WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS produtos_destaque_idx
  ON produtos (destaque, publicado_em DESC)
  WHERE status = 'ACTIVE' AND destaque = TRUE;

CREATE INDEX IF NOT EXISTS variantes_produto_ativas_idx
  ON produto_variantes (produto_id)
  WHERE ativa = TRUE;

CREATE INDEX IF NOT EXISTS variantes_estoque_baixo_idx
  ON produto_variantes ((estoque - estoque_reservado))
  WHERE ativa = TRUE;

CREATE INDEX IF NOT EXISTS produto_imagens_produto_ordem_idx
  ON produto_imagens (produto_id, ordem, id);

CREATE INDEX IF NOT EXISTS produto_colecoes_colecao_ordem_idx
  ON produto_colecoes (colecao_id, ordem, produto_id);

CREATE INDEX IF NOT EXISTS pedidos_cliente_criado_idx
  ON pedidos (cliente_id, criado_em DESC)
  WHERE cliente_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS pedidos_status_criado_idx
  ON pedidos (status, criado_em DESC);

CREATE INDEX IF NOT EXISTS pedido_itens_pedido_idx
  ON pedido_itens (pedido_id);

CREATE INDEX IF NOT EXISTS pagamentos_pedido_idx
  ON pagamentos (pedido_id, criado_em DESC);

CREATE INDEX IF NOT EXISTS pagamentos_status_idx
  ON pagamentos (status, criado_em DESC);

CREATE INDEX IF NOT EXISTS cupom_utilizacoes_cupom_cliente_idx
  ON cupom_utilizacoes (cupom_id, cliente_id)
  WHERE cliente_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS cupom_utilizacoes_cupom_email_idx
  ON cupom_utilizacoes (cupom_id, email_normalizado);

CREATE INDEX IF NOT EXISTS webhook_eventos_pendentes_idx
  ON webhook_eventos (recebido_em)
  WHERE status_processamento IN ('RECEIVED', 'FAILED');

CREATE INDEX IF NOT EXISTS sessoes_admin_ativas_idx
  ON sessoes (admin_id, expira_em)
  WHERE revogada_em IS NULL;

CREATE INDEX IF NOT EXISTS password_reset_admin_ativos_idx
  ON password_reset_tokens (admin_id, expira_em)
  WHERE usado_em IS NULL;

CREATE INDEX IF NOT EXISTS audit_logs_admin_criado_idx
  ON audit_logs (admin_id, criado_em DESC)
  WHERE admin_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS audit_logs_recurso_idx
  ON audit_logs (tipo_recurso, recurso_id, criado_em DESC);

CREATE INDEX IF NOT EXISTS movimentos_estoque_variante_idx
  ON movimentos_estoque (variante_id, criado_em DESC);

CREATE INDEX IF NOT EXISTS reservas_estoque_expiracao_idx
  ON reservas_estoque (expira_em)
  WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS pedido_status_historico_pedido_idx
  ON pedido_status_historico (pedido_id, criado_em);

CREATE INDEX IF NOT EXISTS idempotency_keys_expiracao_idx
  ON idempotency_keys (expira_em);

RESET ROLE;
