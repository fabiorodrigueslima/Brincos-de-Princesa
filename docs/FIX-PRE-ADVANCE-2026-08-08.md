# CORREÇÕES PRÉ-AVANÇO — RESULTADO

Data: 8 de agosto de 2026  
Escopo: correção dirigida dos bloqueadores FUNC-001, RESP-001, TEST-001, DB-001 e GIT-001 da auditoria `docs/AUDIT-2026-08-08.md`.  
Limite respeitado: nenhuma funcionalidade comercial futura foi implementada.

## Problemas originais

- a navegação React podia remover toda a interface e registrar `destroy is not a function`;
- `/personalizados` e `/como-e-feito` excediam o viewport entre 320 e 390 px;
- a revalidação também encontrou o grid de `/contato` excedendo o espaço útil em 768 px;
- dois testes PostgreSQL eram pulados no comando normal e dependiam de uma fixture aplicada manualmente;
- `brinco_app` possuía escrita ampla, acesso a sequências, banco temporário e privilégios padrão excessivos;
- o diretório não possuía repositório Git.

## Causa raiz

- `ScrollToTop` retornava implicitamente o resultado de `window.scrollTo` no callback de `useEffect`; React aceita apenas `undefined` ou uma função de limpeza;
- `text-wrap: balance`, itens de grid sem largura mínima explícita e uma quebra de grid tardia permitiam que o conteúdo ultrapassasse a largura útil;
- os testes de integração só consultavam slugs fixos de `database/test_catalog.sql`, sem setup, isolamento ou teardown próprios;
- `database/tables.sql` concedia CRUD em todas as tabelas e uso de todas as sequências, tentando restringir apenas alguns objetos depois;
- `db:check` inferia a estrutura total por `information_schema`, que corretamente deixou de revelar as 20 tabelas sem acesso ao papel mínimo;
- o Git nunca havia sido inicializado neste diretório.

## Correções aplicadas

| ID | PROBLEMA | CAUSA | CORREÇÃO | ARQUIVOS | TESTE | STATUS |
|---|---|---|---|---|---|---|
| FUNC-001 | Tela vazia ao navegar | retorno implícito do efeito | efeito com bloco sem retorno, teste de regressão e Error Boundary | `ScrollToTop.jsx`, `scrollViewportToTop.js`, `ScrollToTop.test.jsx`, `AppErrorBoundary.jsx`, `main.jsx` | teste unitário, menu, histórico, reload, rotas diretas e prévia de produção | CORRIGIDO |
| RESP-001 | Scroll horizontal | títulos balanceados, itens mínimos e breakpoint tardio | largura calculada explícita, `min-width: 0`, quebra segura de texto e grid de contato em 820 px | `global.css` | 12 páginas em 320/375/390/768/1024/1440 | CORRIGIDO |
| TEST-001 | 2 testes pulados/dependentes de fixture | fixture externa e banco não isolado | banco `_test` protegido, schema preparado automaticamente e fixture parametrizada com teardown | testes e scripts do backend | 17/17 backend, fixture final com zero linhas | CORRIGIDO |
| DB-001 | Privilégios excessivos | grants globais de tabelas, sequências e defaults | runtime somente leitura nas 6 tabelas do catálogo; script idempotente para banco existente | SQL, `checkDatabase.js`, testes e documentação | consulta de grants, `verify.sql`, API e `db:check` | CORRIGIDO |
| GIT-001 | Sem versionamento local | repositório ausente | revisão de ignore/secrets e `git init -b main` | `.gitignore` e metadados locais do Git | status, branch, remotos e `check-ignore` | CORRIGIDO |

## Arquivos alterados

Alterados (15):

- `.gitignore`;
- `package-lock.json`;
- `frontend/package.json`;
- `frontend/src/main.jsx`;
- `frontend/src/components/common/ScrollToTop.jsx`;
- `frontend/src/styles/global.css`;
- `backend/.env.example`;
- `backend/package.json`;
- `backend/src/scripts/checkDatabase.js`;
- `backend/tests/catalog-postgres.integration.test.js`;
- `backend/tests/database-sql.test.js`;
- `database/database.sql`;
- `database/tables.sql`;
- `database/verify.sql`;
- `docs/DATABASE.md`.

Criados (6):

- `frontend/src/components/common/AppErrorBoundary.jsx`;
- `frontend/src/components/common/ScrollToTop.test.jsx`;
- `frontend/src/components/common/scrollViewportToTop.js`;
- `backend/tests/run-postgres-integration.js`;
- `database/permissions.sql`;
- `docs/FIX-PRE-ADVANCE-2026-08-08.md`.

Total: 21 arquivos de projeto alterados ou criados. A pasta `.git` foi inicializada localmente e não é contada como arquivo de projeto.

## Testes executados

- lint dos workspaces frontend e backend;
- build Vite de produção;
- 1 teste frontend de regressão do efeito;
- 15 testes backend sem banco;
- 2 testes de integração PostgreSQL isolados;
- `database/verify.sql` no banco real, dentro de transação revertida;
- `db:check` com as seis tabelas de runtime e quatro categorias ativas;
- fixture de teste consultada após a suíte: zero produtos, zero coleções e zero variantes;
- API real: live, ready, categorias, coleções, produtos, produto inexistente, sort inválido e CORS permitido/bloqueado;
- `npm audit` sem correção automática e sem `--force`;
- busca de segredo hardcoded, chaves privadas e formatos conhecidos de token;
- Git status, branch, remotos e regras de ignore;
- navegador em desenvolvimento e prévia de produção.

## Resultado

- testes: 18 aprovados, 0 falhos e 0 pulados (frontend 1; backend 17);
- lint: PASS nos dois workspaces;
- build: PASS, 44 módulos, JS 264,48 kB e CSS 21,87 kB;
- dependências: 0 vulnerabilidades conhecidas;
- API: contratos e códigos esperados preservados;
- banco real: conectado, schema de runtime válido e `verify.sql` aprovado;
- navegador: console sem erro ou aviso relevante após toda a navegação;
- secrets: nenhum segredo real encontrado fora do `.env` ignorado.

## Mobile

Foram avaliadas 12 páginas em cada uma das larguras 320, 375, 390, 768, 1024 e 1440 px, totalizando 72 combinações:

`/`, `/sobre`, `/colecoes`, `/loja`, `/produto/produto-inexistente`, `/personalizados`, `/como-e-feito`, `/contato`, `/privacidade`, `/termos`, `/trocas-e-devolucoes` e `/rota-inexistente`.

Resultado final: zero overflow horizontal e zero página vazia nas 72 combinações. Em 320 px, a barra vertical reduz `clientWidth` para 305 px, mas `scrollWidth` e `window.innerWidth` permanecem em 320 px; portanto, não existe rolagem horizontal real. O menu móvel abriu e fechou com `aria-expanded` e classe visual consistentes.

## Navegação

- sete links do menu principal: PASS;
- voltar e avançar do navegador: PASS;
- recarga da rota atual: PASS;
- 12 acessos diretos: PASS;
- 404 React em rota desconhecida: PASS;
- clique interno na build de produção: PASS;
- console anterior: erros de efeito e `destroy is not a function` reproduzidos;
- console posterior: zero erros e zero avisos relevantes.

## PostgreSQL

- banco de desenvolvimento preservado: `brinco_de_princesa`;
- banco isolado criado para testes: `brinco_de_princesa_test`;
- o runner recusa produção, banco sem `_test`, o mesmo nome de desenvolvimento e host remoto não autorizado;
- schema de teste reinicializado automaticamente a cada execução;
- fixture usa valores parametrizados, identificadores exclusivos e exclusão na ordem inversa das FKs;
- resultado: 17 PASS, 0 FAIL, 0 SKIPPED no backend;
- após a suíte: nenhuma linha de fixture restante;
- `verify.sql`: PASS com rollback confirmado;
- `db:check`: `connected=true`, `runtimeTables=6`, `activeCategories=4`, `schemaValid=true`.

## Permissões brinco_app

Antes:

- `TEMP` no banco;
- `SELECT` em 26 tabelas;
- `INSERT` em 26 tabelas;
- `UPDATE` em 21 tabelas;
- `DELETE` em 18 tabelas;
- `USAGE` em 22 sequências;
- defaults de CRUD e sequência;
- exclusão de administradores/sessões e atualização de pedidos/pagamentos.

Depois:

- `CONNECT` no banco e `USAGE` no schema;
- `SELECT` somente em `categorias`, `colecoes`, `produtos`, `produto_variantes`, `produto_imagens` e `produto_colecoes`;
- zero `INSERT`, `UPDATE`, `DELETE`, sequências, `TEMP`, função interna ou privilégio padrão amplo;
- atributos perigosos continuam desativados: superuser, createdb, createrole, replication e bypassrls são falsos.

Permissões removidas: 20 grants de leitura, 26 de inserção, 21 de atualização, 18 de exclusão, acesso a 22 sequências, `TEMP`, execução da função interna e dois conjuntos de privilégios padrão. O papel administrador/owner continua separado do papel de runtime.

## Git

- repositório local inicializado na branch `main`;
- nenhum commit criado;
- nenhum remoto configurado;
- nenhum push executado;
- nenhum arquivo adicionado ao índice;
- `backend/.env`, todos os `node_modules` e `dist` confirmados como ignorados;
- `.env.example` permanece elegível para versionamento e contém apenas placeholders.

## Riscos restantes

- o banco de desenvolvimento ainda não possui produto real; o caminho positivo foi validado no banco isolado de teste, não com catálogo comercial;
- migrations incrementais ainda não existem;
- acessibilidade automatizada, contraste/foco, headers do futuro hosting, concorrência de estoque e observabilidade continuam fora desta correção;
- não existe suíte E2E persistida; a navegação foi validada diretamente no navegador nesta reauditoria;
- Git ainda não tem primeiro commit por determinação expressa desta fase.

Esses itens devem ser avaliados na nova auditoria ou na fase própria. Eles não reabrem os cinco bloqueadores estruturais corrigidos aqui.

## Funcionalidades futuras

- carrinho: **NÃO IMPLEMENTADO — PREVISTO PARA FASE FUTURA**;
- checkout: **NÃO IMPLEMENTADO — PREVISTO PARA FASE FUTURA**;
- pagamentos e webhooks: **NÃO IMPLEMENTADO — PREVISTO PARA FASE FUTURA**;
- autenticação, sessão, CSRF e RBAC: **NÃO IMPLEMENTADO — PREVISTO PARA FASE FUTURA**;
- painel/CRUD administrativo: **NÃO IMPLEMENTADO — PREVISTO PARA FASE FUTURA**;
- cupons e aplicação comercial: **NÃO IMPLEMENTADO — PREVISTO PARA FASE FUTURA**;
- transações concorrentes de estoque e checkout: **NÃO IMPLEMENTADO — PREVISTO PARA FASE FUTURA**.

Este relatório aprova o projeto apenas para uma nova auditoria. Ele não aprova o início automático da próxima fase funcional.

STATUS: APROVADO PARA NOVA AUDITORIA
