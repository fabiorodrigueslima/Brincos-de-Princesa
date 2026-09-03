ALTER TABLE app.produto_imagens ADD COLUMN IF NOT EXISTS storage_key VARCHAR(240);
CREATE UNIQUE INDEX IF NOT EXISTS produto_imagens_storage_key_uk ON app.produto_imagens(storage_key) WHERE storage_key IS NOT NULL;
GRANT DELETE ON app.produto_imagens TO brinco_app;
