# Banco de dados

O projeto usa PostgreSQL e a biblioteca `pg`, sem ORM. O schema é mantido manualmente em quatro arquivos:

1. `database/database.sql`: papéis de menor privilégio, banco, schema e configuração básica;
2. `database/tables.sql`: tabelas, constraints, relacionamentos, triggers e grants;
3. `database/indexes.sql`: índices orientados aos acessos planejados;
4. `database/seed.sql`: categorias e configurações públicas, sem usuários ou segredos.

`database/permissions.sql` reaplica de forma idempotente o menor privilégio em uma instalação existente.

## Inicialização

Execute a partir da raiz com um usuário administrador do PostgreSQL. A senha abaixo é a senha nova do papel limitado da aplicação e não deve ser reutilizada nem salva no repositório.

```powershell
psql -v APP_DB_PASSWORD="substitua-por-uma-senha-forte" -f database/database.sql postgres
psql -f database/tables.sql postgres
psql -f database/indexes.sql postgres
psql -f database/seed.sql postgres
psql -f database/permissions.sql postgres
psql -f database/verify.sql postgres
```

Depois configure `DATABASE_URL` somente no ambiente local/secret manager, usando o papel `brinco_app`. Nunca use `postgres` ou outro superusuário na aplicação.

No desenvolvimento, salve a configuração em `backend/.env` (arquivo ignorado pelo Git) e valide sem revelar a senha:

```powershell
npm run db:check --workspace backend
```

O comando confirma banco, usuário, quantidade de tabelas e categorias ativas, mas nunca imprime a URL de conexão.

O papel `brinco_owner` administra a estrutura e não faz login. O papel `brinco_app` é exclusivo da API: possui `CONNECT`, `USAGE` no schema `app` e `SELECT` somente em `categorias`, `colecoes`, `produtos`, `produto_variantes`, `produto_imagens` e `produto_colecoes`. Ele não recebe escrita, sequências, funções internas ou banco temporário antecipadamente.

`verify.sql` executa dentro de uma transação revertida. Ele confirma a quantidade de tabelas, rejeição de estoque negativo, cupom percentual inválido, total adulterado e os limites do papel da aplicação.

## Integração PostgreSQL isolada

`npm test --workspace backend` executa primeiro os testes sem banco e depois cria/reinicializa automaticamente o schema do banco local `brinco_de_princesa_test`. A fixture de catálogo é inserida e removida pela própria suíte.

O preparador recusa `NODE_ENV=production`, nomes sem o sufixo `_test`, o mesmo nome do banco de desenvolvimento e hosts remotos sem autorização explícita. Quando as senhas locais de `postgres` e `brinco_app` forem diferentes, defina `TEST_DATABASE_URL` e `TEST_DATABASE_ADMIN_URL` apenas no arquivo `.env` ignorado ou no secret manager do CI. Nunca aponte essas variáveis para desenvolvimento ou produção.

## Convenções

- valores financeiros usam `NUMERIC(12,2)`;
- datas usam `TIMESTAMPTZ`;
- e-mails e códigos possuem índices normalizados;
- pedidos guardam snapshots de cliente, endereço, produto, SKU, variante e preço;
- status de pedido e pagamento são independentes;
- estoque físico e reservado são separados;
- IDs internos não servem como credencial de acesso;
- tokens de sessão, reset, pedido e idempotência são armazenados somente como hash;
- dados completos de cartão e CVV não possuem coluna e não podem ser persistidos neste schema.

## Alterações futuras

Após a primeira publicação, nunca edite retrospectivamente um script já aplicado. Crie migrações SQL numeradas e registre cada aplicação em uma tabela de controle a ser introduzida antes do primeiro deploy.
