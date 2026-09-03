ALTER TABLE app.produtos
  ADD COLUMN IF NOT EXISTS largura_cm NUMERIC(8,2) CHECK (largura_cm IS NULL OR largura_cm > 0),
  ADD COLUMN IF NOT EXISTS altura_cm NUMERIC(8,2) CHECK (altura_cm IS NULL OR altura_cm > 0),
  ADD COLUMN IF NOT EXISTS comprimento_cm NUMERIC(8,2) CHECK (comprimento_cm IS NULL OR comprimento_cm > 0);

ALTER TABLE app.produto_variantes
  ADD COLUMN IF NOT EXISTS peso_gramas NUMERIC(8,2) CHECK (peso_gramas IS NULL OR peso_gramas > 0),
  ADD COLUMN IF NOT EXISTS largura_cm NUMERIC(8,2) CHECK (largura_cm IS NULL OR largura_cm > 0),
  ADD COLUMN IF NOT EXISTS altura_cm NUMERIC(8,2) CHECK (altura_cm IS NULL OR altura_cm > 0),
  ADD COLUMN IF NOT EXISTS comprimento_cm NUMERIC(8,2) CHECK (comprimento_cm IS NULL OR comprimento_cm > 0);

ALTER TABLE app.clientes
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS email_verificado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tentativas_login_falhas SMALLINT NOT NULL DEFAULT 0 CHECK (tentativas_login_falhas >= 0),
  ADD COLUMN IF NOT EXISTS bloqueado_ate TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS anonimizado_em TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS app.cliente_sessoes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cliente_id BIGINT NOT NULL REFERENCES app.clientes(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  csrf_secret_hash CHAR(64) NOT NULL,
  expira_em TIMESTAMPTZ NOT NULL,
  revogada_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cliente_sessoes_expiracao CHECK (expira_em > criado_em)
);

CREATE TABLE IF NOT EXISTS app.cliente_password_reset_tokens (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cliente_id BIGINT NOT NULL REFERENCES app.clientes(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expira_em TIMESTAMPTZ NOT NULL,
  usado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cliente_reset_expiracao CHECK (expira_em > criado_em)
);

CREATE INDEX IF NOT EXISTS cliente_sessoes_ativas_idx ON app.cliente_sessoes(cliente_id, expira_em) WHERE revogada_em IS NULL;
CREATE INDEX IF NOT EXISTS cliente_reset_ativos_idx ON app.cliente_password_reset_tokens(cliente_id, expira_em) WHERE usado_em IS NULL;

GRANT SELECT, INSERT, UPDATE ON app.clientes, app.enderecos, app.cliente_sessoes, app.cliente_password_reset_tokens TO brinco_app;
GRANT DELETE ON app.enderecos TO brinco_app;
GRANT USAGE, SELECT ON SEQUENCE app.cliente_sessoes_id_seq, app.cliente_password_reset_tokens_id_seq TO brinco_app;
