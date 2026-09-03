ALTER TABLE app.pedidos
  ADD COLUMN IF NOT EXISTS frete_metodo VARCHAR(120),
  ADD COLUMN IF NOT EXISTS frete_transportadora VARCHAR(120),
  ADD COLUMN IF NOT EXISTS frete_prazo_dias SMALLINT CHECK (frete_prazo_dias IS NULL OR frete_prazo_dias >= 0);

ALTER TABLE app.pedido_status_historico
  ADD COLUMN IF NOT EXISTS origem VARCHAR(16) NOT NULL DEFAULT 'SYSTEM'
  CHECK (origem IN ('SYSTEM','WEBHOOK','ADMIN','CUSTOMER'));
