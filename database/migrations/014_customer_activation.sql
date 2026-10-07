CREATE TABLE app.cliente_activation_tokens (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cliente_id BIGINT NOT NULL REFERENCES app.clientes(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expira_em TIMESTAMPTZ NOT NULL,
  usado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (expira_em > criado_em)
);
CREATE INDEX cliente_activation_ativos_idx ON app.cliente_activation_tokens(cliente_id, expira_em) WHERE usado_em IS NULL;
GRANT SELECT, INSERT, UPDATE ON app.cliente_activation_tokens TO brinco_app;
GRANT USAGE, SELECT ON SEQUENCE app.cliente_activation_tokens_id_seq TO brinco_app;
