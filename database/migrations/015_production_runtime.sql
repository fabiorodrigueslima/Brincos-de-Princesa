ALTER TABLE app.pagamentos ADD COLUMN checkout_url TEXT;
ALTER TABLE app.pagamentos ADD COLUMN initiation_state VARCHAR(16) NOT NULL DEFAULT 'LEGACY'
  CHECK (initiation_state IN ('LEGACY','CREATING','READY','UNKNOWN'));

CREATE TABLE app.rate_limits (
  key_hash CHAR(64) PRIMARY KEY,
  hits INTEGER NOT NULL CHECK (hits > 0),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX rate_limits_expiry_idx ON app.rate_limits(expires_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON app.rate_limits TO brinco_app;

CREATE TABLE app.job_leases (
  name VARCHAR(80) PRIMARY KEY,
  owner UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON app.job_leases TO brinco_app;

CREATE TABLE app.image_upload_intents (
  id UUID PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES app.produtos(id),
  public_id TEXT NOT NULL UNIQUE,
  mime VARCHAR(40) NOT NULL,
  bytes INTEGER NOT NULL CHECK (bytes > 0 AND bytes <= 5242880),
  alt VARCHAR(220) NOT NULL,
  is_primary BOOLEAN NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  completed_image_id BIGINT REFERENCES app.produto_imagens(id) ON DELETE SET NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON app.image_upload_intents TO brinco_app;
