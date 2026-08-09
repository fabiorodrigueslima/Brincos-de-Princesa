# PostgreSQL manual

O banco usa SQL manual e `pg`, sem ORM. Os 26 objetos de negócio existentes continuam definidos pelos scripts históricos `database.sql`, `tables.sql`, `indexes.sql` e `seed.sql`. A partir da baseline de 08/08/2026, toda evolução deve ser feita em `migrations/`.

## Estrutura

```text
database/
  migrations/          migrations incrementais imutáveis
  seeds/development/   dados demonstrativos, nunca produção
  scripts/             inventários e diagnósticos somente leitura
  database.sql         bootstrap histórico de banco e papéis
  tables.sql           bootstrap histórico das 26 tabelas
  indexes.sql          bootstrap histórico dos índices
  seed.sql             dados públicos estruturais
  permissions.sql      menor privilégio do runtime
  verify.sql           verificação transacional com rollback
```

## Comandos reais

```powershell
npm run db:check
npm run db:migrate
npm run db:seed:dev
npm test
```

`db:migrate` usa uma conexão administrativa separada, registra checksum e executa cada arquivo novo em transação. `db:seed:dev` é recusado em produção, em bancos `_test` e em qualquer banco diferente de `brinco_de_princesa`.

Nunca edite uma migration aplicada. Crie a próxima versão numérica e execute todos os testes. Consulte `docs/DATABASE-MIGRATIONS.md`.
