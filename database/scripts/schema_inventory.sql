\set ON_ERROR_STOP on
\connect brinco_de_princesa

-- Inventário somente leitura. Execute com uma credencial administrativa.
SELECT c.table_name,
       c.ordinal_position,
       c.column_name,
       format_type(a.atttypid, a.atttypmod) AS data_type,
       c.is_nullable,
       c.is_identity,
       c.column_default
  FROM information_schema.columns c
  JOIN pg_namespace n ON n.nspname = c.table_schema
  JOIN pg_class t ON t.relnamespace = n.oid AND t.relname = c.table_name
  JOIN pg_attribute a ON a.attrelid = t.oid AND a.attname = c.column_name
 WHERE c.table_schema = 'app'
 ORDER BY c.table_name, c.ordinal_position;

SELECT table_name, constraint_type, constraint_name
  FROM information_schema.table_constraints
 WHERE table_schema = 'app'
 ORDER BY table_name, constraint_type, constraint_name;

SELECT tablename, indexname, indexdef
  FROM pg_indexes
 WHERE schemaname = 'app'
 ORDER BY tablename, indexname;
