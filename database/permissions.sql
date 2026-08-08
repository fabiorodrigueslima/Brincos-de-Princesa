\set ON_ERROR_STOP on
\connect brinco_de_princesa

-- Execute como administrador depois de revisar o nome do banco acima.
-- Este script é idempotente e reduz o papel de runtime à leitura do catálogo público.
REVOKE TEMPORARY ON DATABASE brinco_de_princesa FROM brinco_app;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

SET ROLE brinco_owner;
SET search_path = app, public;

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA app FROM brinco_app;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA app FROM brinco_app;
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA app FROM brinco_app;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA app FROM PUBLIC;

ALTER DEFAULT PRIVILEGES FOR ROLE brinco_owner IN SCHEMA app
  REVOKE ALL PRIVILEGES ON TABLES FROM brinco_app;
ALTER DEFAULT PRIVILEGES FOR ROLE brinco_owner IN SCHEMA app
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM brinco_app;
ALTER DEFAULT PRIVILEGES FOR ROLE brinco_owner IN SCHEMA app
  REVOKE ALL PRIVILEGES ON FUNCTIONS FROM brinco_app;
ALTER DEFAULT PRIVILEGES FOR ROLE brinco_owner IN SCHEMA app
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

GRANT SELECT ON app.categorias, app.colecoes, app.produtos, app.produto_variantes,
  app.produto_imagens, app.produto_colecoes TO brinco_app;

RESET ROLE;

\echo 'Permissões aplicadas: brinco_app possui somente CONNECT, USAGE no schema e SELECT no catálogo público.'
