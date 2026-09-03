CREATE TABLE IF NOT EXISTS app.email_outbox (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_key VARCHAR(180) NOT NULL UNIQUE,
  template VARCHAR(60) NOT NULL,
  recipient VARCHAR(254) NOT NULL,
  variables JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(variables)='object'),
  status VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PROCESSING','SENT','FAILED')),
  attempts SMALLINT NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  last_error VARCHAR(80),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_outbox_pending_idx ON app.email_outbox(available_at,id) WHERE status IN ('PENDING','FAILED');
GRANT SELECT,INSERT,UPDATE ON app.email_outbox TO brinco_app;
GRANT USAGE,SELECT ON SEQUENCE app.email_outbox_id_seq TO brinco_app;
