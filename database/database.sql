\set ON_ERROR_STOP on

-- Execute como um administrador do PostgreSQL:
-- psql -v APP_DB_PASSWORD="uma-senha-forte" -f database/database.sql postgres
-- A senha é recebida apenas pela sessão do psql e nunca deve ser salva neste arquivo.

\if :{?APP_DB_PASSWORD}
\else
  \echo 'ERRO: informe APP_DB_PASSWORD com -v. Nenhuma alteração foi feita.'
  \quit 1
\endif

SELECT 'CREATE ROLE brinco_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT'
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'brinco_owner')
\gexec

SELECT format(
  'CREATE ROLE brinco_app LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT',
  :'APP_DB_PASSWORD'
)
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'brinco_app')
\gexec

SELECT format('ALTER ROLE brinco_app PASSWORD %L', :'APP_DB_PASSWORD')
WHERE EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'brinco_app')
\gexec

SELECT 'CREATE DATABASE brinco_de_princesa OWNER brinco_owner ENCODING ''UTF8'' TEMPLATE template0'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'brinco_de_princesa')
\gexec

REVOKE ALL ON DATABASE brinco_de_princesa FROM PUBLIC;
GRANT CONNECT ON DATABASE brinco_de_princesa TO brinco_app;
REVOKE TEMPORARY ON DATABASE brinco_de_princesa FROM brinco_app;

\connect brinco_de_princesa

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
CREATE SCHEMA IF NOT EXISTS app AUTHORIZATION brinco_owner;
GRANT USAGE ON SCHEMA app TO brinco_app;
ALTER ROLE brinco_app IN DATABASE brinco_de_princesa SET search_path = app, public;
ALTER ROLE brinco_app IN DATABASE brinco_de_princesa SET statement_timeout = '10s';
ALTER ROLE brinco_app IN DATABASE brinco_de_princesa SET lock_timeout = '3s';

\echo 'Banco e papéis criados. Execute tables.sql, indexes.sql e seed.sql nesta ordem.'
