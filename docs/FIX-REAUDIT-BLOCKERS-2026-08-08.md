# Correção dos Bloqueadores da Reauditoria

Data: 8 de agosto de 2026  
Escopo: correção exclusiva dos bloqueadores `RA-SEC-001` e `RA-GIT-001` registrados em `docs/REAUDIT-2026-08-08.md`.

Nenhuma funcionalidade comercial, refatoração arquitetural, migration ou alteração de grant foi realizada. Nenhuma senha, hash, token ou secret é reproduzido neste documento.

## 1. Resumo

Os dois bloqueadores altos foram corrigidos:

1. o papel PostgreSQL `brinco_app` recebeu uma credencial nova, forte, aleatória e exclusiva, mantida somente em `backend/.env` ignorado;
2. foi criada a baseline inicial local do Git na branch `main`, depois da revisão do ignore, busca de secrets e inspeção integral do staging.

A correção foi seguida por autenticação positiva e negativa no PostgreSQL, auditoria de privilégios, `db:check`, `verify.sql`, testes frontend/backend/PostgreSQL, lint, build, auditorias npm, API e navegação rápida.

## 2. Separação de credenciais PostgreSQL

A credencial administrativa de `postgres` foi preservada e a credencial runtime de `brinco_app` foi rotacionada. O backend continua usando exclusivamente `brinco_app` no banco `brinco_de_princesa`.

O ambiente local ignorado passou a definir separadamente:

- conexão runtime de desenvolvimento;
- conexão runtime do banco `brinco_de_princesa_test`;
- conexão administrativa usada somente para preparar o banco de integração.

O arquivo versionável `backend/.env.example` contém somente os placeholders distintos `CHANGE_ME_RUNTIME` e `CHANGE_ME_ADMIN`.

O runner `backend/tests/run-postgres-integration.js` não deriva mais uma conexão administrativa trocando o username da URL runtime. Agora ele:

- exige `TEST_DATABASE_ADMIN_URL` explícita;
- rejeita o mesmo username para runtime e administração;
- rejeita senha igual entre runtime e administração;
- preserva as proteções de banco `_test`, ambiente não produtivo e host local.

## 3. Permissões do brinco_app

A operação no papel foi limitada à troca de senha. Nenhum `GRANT`, `REVOKE`, membership ou default privilege foi alterado nesta fase.

Resultado efetivo após a rotação:

| Escopo | Privilégio | Resultado |
|---|---|---|
| role | SUPERUSER | NÃO |
| role | CREATEDB | NÃO |
| role | CREATEROLE | NÃO |
| role | REPLICATION | NÃO |
| role | BYPASSRLS | NÃO |
| database | CONNECT | SIM |
| database | CREATE | NÃO |
| database | TEMPORARY | NÃO |
| schema `app` | USAGE | SIM |
| schema `app` | CREATE | NÃO |
| catálogo público | SELECT | SIM, somente em 6 tabelas |
| 26 tabelas `app` | INSERT/UPDATE/DELETE/TRUNCATE/TRIGGER/REFERENCES | 0 grants |
| sequences | USAGE/SELECT/UPDATE | 0 grants |
| função interna `app` | EXECUTE | 0 grants |
| memberships | qualquer | 0 |
| default privileges | concessões para `brinco_app` | 0 |

As seis tabelas legíveis permanecem: `categorias`, `colecoes`, `produtos`, `produto_variantes`, `produto_imagens` e `produto_colecoes`.

## 4. Validação de autenticação PostgreSQL

Os testes foram feitos sem imprimir credenciais:

| Verificação | Resultado |
|---|---|
| `brinco_app` com credencial própria | **PASS** |
| identidade retornada | `brinco_app` em `brinco_de_princesa` |
| credencial de `brinco_app` tentando autenticar `postgres` | **NÃO AUTENTICA — PASS** |
| conexão administrativa separada para testes | **PASS** |

O bloqueador de segregação foi eliminado: a credencial runtime não permite assumir o superusuário.

## 5. Git

Estado encontrado antes das correções:

- branch: `main`;
- commits: 0;
- remote: `origin` configurado para fetch/push;
- o projeto já chegou a esta tarefa com 86 arquivos adicionados ao staging;
- nenhum `.env`, `node_modules`, `dist` ou artefato proibido estava staged.

Após a correção, todo o staging foi reconstruído com `git add .` somente depois das buscas de secrets e da revisão do `.gitignore`. A lista staged foi inspecionada antes do commit.

Resultado final:

- branch: `main`;
- commit inicial: SIM;
- quantidade de commits: 1;
- working tree: clean;
- remote: `origin` preservado;
- push realizado: **NÃO**.

Mensagem utilizada:

`chore: estrutura inicial segura do projeto Brinco de Princesa`

## 6. .gitignore

Confirmado como ignorado:

- `.env`, `.env.local`, `.env.development`, `.env.production` e demais `.env.*`;
- `node_modules`;
- `dist` e `dist-ssr`;
- logs e `*.log`;
- `coverage`;
- caches, temporários, uploads e arquivos locais;
- chaves/credenciais locais com extensões `.pem`, `.key`, `.p12`, `.pfx`, `.jks`, `.secret` e `.secrets`;
- nomes comuns `id_rsa*` e `id_ed25519*`.

Os arquivos `.env.example` continuam explicitamente permitidos para versionamento e contêm somente placeholders.

## 7. Busca de secrets

A busca foi executada sobre todos os arquivos que poderiam entrar no Git, incluindo frontend, backend, database e docs.

Termos verificados:

`password`, `passwd`, `secret`, `token`, `apikey`, `api_key`, `private_key`, `DATABASE_URL`, `DB_PASSWORD`, `JWT_SECRET`, `SESSION_SECRET`, `PAYMENT_SECRET` e `WEBHOOK_SECRET`.

Resultado:

- ocorrências contextuais foram revisadas em documentação, nomes de tabelas, testes e placeholders;
- credenciais reais em arquivos versionáveis: 0;
- private keys: 0;
- tokens conhecidos: 0;
- arquivos proibidos staged: 0;
- `backend/.env`: ignorado e ausente do staging.

## 8. Primeiro commit

O primeiro commit local foi criado somente após:

1. confirmar a separação das credenciais;
2. validar que os grants não mudaram;
3. executar a regressão técnica;
4. revisar completamente o `.gitignore`;
5. buscar secrets em todos os candidatos ao Git;
6. executar `git add .`;
7. revisar a lista integral de arquivos staged.

O commit estabelece a baseline auditável e o ponto de rollback que faltavam. Nenhum push foi executado.

## 9. Testes executados

| Teste | Resultado |
|---|---|
| autenticação `brinco_app` | PASS |
| rejeição da credencial runtime para `postgres` | PASS |
| privilégios efetivos | PASS |
| `db:check` | PASS |
| frontend tests | 1 pass, 0 fail, 0 skip |
| backend unit tests | 15 pass, 0 fail, 0 skip |
| PostgreSQL integration tests | 2 pass, 0 fail, 0 skip |
| total | 18 pass, 0 fail, 0 skip |
| `verify.sql` | PASS |
| rollback de `verify.sql` | PASS; zero resíduo |
| lint frontend | PASS |
| lint backend | PASS |
| build frontend | PASS; 44 módulos |
| npm audit frontend | 0 vulnerabilidades |
| npm audit backend | 0 vulnerabilidades |
| API health/catálogo | 200 JSON |
| API desconhecida | 404 JSON |
| navegador: Home | PASS |
| navegador: Loja/catálogo vazio controlado | PASS |
| navegador: produto inexistente controlado | PASS |
| navegador: 404 frontend | PASS |
| console do navegador | 0 error/warning relevante |

O banco de integração permaneceu `brinco_de_princesa_test`, distinto de `brinco_de_princesa`. A fixture continuou autocontida e a execução não deixou resíduos.

## 10. Resultado

### POSTGRESQL

`brinco_app` com credencial própria: **PASS**  
Credencial de `brinco_app` autentica `postgres`: **NÃO**  
Privilégios do `brinco_app`: **CONNECT + USAGE + SELECT somente nas 6 tabelas públicas; zero privilégio elevado ou escrita**

### BACKEND

`db:check`: **PASS**

### TESTES

Frontend: **1 pass, 0 fail, 0 skip**  
Backend unitário: **15 pass, 0 fail, 0 skip**  
PostgreSQL: **2 pass, 0 fail, 0 skip**  
`verify.sql`: **PASS + ROLLBACK**  
Lint: **frontend PASS; backend PASS**  
Build: **PASS**  
npm audit: **frontend 0; backend 0 vulnerabilidades**

### GIT

Branch: **main**  
Commit inicial: **SIM**  
Quantidade de commits: **1**  
Working tree: **clean**  
Remote: **origin configurado e preservado**  
Push realizado: **NÃO**

## 11. Riscos restantes

Os achados não bloqueadores da reauditoria permanecem fora do escopo desta fase:

- contraste do foco e foco visível das variantes;
- quebra tipográfica em 320 px;
- documentação auxiliar desatualizada;
- fixture SQL antiga não utilizada;
- cobertura frontend/E2E e acessibilidade automatizada;
- migrations incrementais antes da primeira evolução de schema;
- concorrência quando estoque/pedido/checkout transacionais forem implementados.

Esses itens devem ser avaliados na revalidação independente. Esta fase não declara aprovação para a próxima fase funcional.

**STATUS: BLOQUEADORES CORRIGIDOS — PRONTO PARA REVALIDAÇÃO**
