INSERT INTO
  app.configuracoes (chave, valor, descricao, publica)
VALUES
  (
    'checkout.reservation_minutes',
    '30' :: jsonb,
    'Janela técnica configurável da reserva enquanto o pedido aguarda pagamento.',
    FALSE
  ) ON CONFLICT (chave) DO NOTHING;

GRANT
SELECT
,
INSERT
  ON app.clientes,
  app.enderecos,
  app.pedidos,
  app.pedido_itens,
  app.reservas_estoque,
  app.movimentos_estoque,
  app.pedido_status_historico,
  app.idempotency_keys,
  app.pagamentos,
  app.webhook_eventos TO brinco_app;

GRANT
UPDATE
  ON app.produto_variantes,
  app.pedidos,
  app.reservas_estoque,
  app.idempotency_keys,
  app.pagamentos,
  app.webhook_eventos TO brinco_app;

GRANT
SELECT
  ON app.configuracoes TO brinco_app;

GRANT USAGE,
SELECT
  ON ALL SEQUENCES IN SCHEMA app TO brinco_app;