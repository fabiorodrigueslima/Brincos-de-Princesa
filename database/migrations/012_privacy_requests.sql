CREATE TABLE IF NOT EXISTS app.privacy_requests (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cliente_id BIGINT NOT NULL REFERENCES app.clientes(id) ON DELETE RESTRICT,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ACCESS','CORRECTION','DELETION')),
  status VARCHAR(16) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_REVIEW','COMPLETED','DENIED')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  concluido_em TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS privacy_requests_open_uk ON app.privacy_requests(cliente_id,tipo) WHERE status IN ('OPEN','IN_REVIEW');
GRANT SELECT,INSERT,UPDATE ON app.privacy_requests TO brinco_app;
GRANT USAGE,SELECT ON SEQUENCE app.privacy_requests_id_seq TO brinco_app;
