ALTER TABLE app.pagamentos
  ADD COLUMN IF NOT EXISTS gateway_preference_id VARCHAR(160);

CREATE UNIQUE INDEX IF NOT EXISTS pagamentos_provedor_preferencia_uk
  ON app.pagamentos (provedor, gateway_preference_id)
  WHERE gateway_preference_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE ON app.pagamentos TO brinco_app;
