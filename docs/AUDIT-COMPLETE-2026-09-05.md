# Auditoria técnica completa — Brinco de Princesa

**Data:** 05/09/2026  
**Escopo:** estado atual do repositório, sem alterações no código de aplicação  
**Método:** inventário de 229 arquivos próprios, rastreamento entre UI/rotas/serviços/repositórios/SQL, leitura de configuração, execução de lint, testes, build, verificação PostgreSQL, setup e `npm audit`.

## 1. Resumo executivo

O projeto possui uma base arquitetural promissora e vários controles corretos: API parametrizada, validação Zod estrita, senhas com scrypt, tokens e CSRF armazenados como hash, cookies HttpOnly, CORS por allowlist, Helmet, rate limiting, dinheiro em `NUMERIC`, reserva transacional de estoque, idempotência para criação de pedido e histórico de estados.

O estado atual, contudo, é uma regressão incompatível com produção. O checkout comercial não pode terminar: os providers reais de frete e Mercado Pago foram substituídos por implementações `disabled`, enquanto os testes e a documentação ainda descrevem funções que já não existem. O arquivo fundador `database/tables.sql` está corrompido e não cria um banco novo. A suíte automatizada falha em 14 testes; a integração PostgreSQL aborta antes de executar. Partes visíveis do admin e da área do cliente chamam endpoints inexistentes. Não há configuração de deploy/CI, sitemap ou mecanismo operacional de backup/rollback.

Não foi encontrado segredo versionado. Existe um `.env` local ignorado; seus valores não foram incluídos nesta auditoria.

## 2. Arquitetura encontrada

**Frontend:** React 19 + Vite 8 + React Router 7, SPA em `frontend/src`, estado de carrinho em Context/localStorage, autenticação de cliente por cookie e CSRF, chamadas HTTP centralizadas em `frontend/src/services/api.js`.

**Backend:** Node/Express 5 em camadas (rotas, controllers, services, repositories, providers, validators e middlewares). SQL parametrizado com `pg`; não há Prisma. API sob `/api/v1`.

**Banco:** PostgreSQL, schema `app`, bootstrap SQL manual, 12 migrations incrementais e seed separado. Há 26 tabelas no baseline, além das criadas posteriormente (cursos, sessões de cliente, outbox e solicitações de privacidade).

**Pagamentos:** serviços e repositório de pedido/pagamento existem, mas o provider ativo é somente `disabled`; a implementação Mercado Pago esperada pelos testes não existe no código atual.

**Infraestrutura:** documentação de produção existe, mas não há Docker, Vercel, Render, Railway, Procfile nem workflow CI/CD versionado.

Fluxo pretendido:

`React → Express/Zod → services → repositories/pg → PostgreSQL`  
`pedido → reserva transacional → preferência externa → webhook autenticado → consumo da reserva`

O segundo fluxo está interrompido nos providers.

## 3. O que já está funcionando (confirmado)

- Build Vite de produção: 60 módulos, JS 315,66 kB (95,11 kB gzip), CSS 30,29 kB (6,78 kB gzip).
- Lint de frontend e backend concluiu sem erro.
- Conexão ao banco local e checagem do schema atual: `schemaValid: true`.
- 27/30 testes frontend passam e 88/99 testes unitários backend passam.
- `npm audit`: 0 vulnerabilidades conhecidas em 382 dependências.
- Validação do carrinho recompõe preço e disponibilidade no servidor.
- Criação de pedido usa locks, transação, reserva condicional e chave idempotente.
- Consultas SQL inspecionadas usam parâmetros; não foi encontrada injeção SQL direta.
- Senhas usam scrypt com salt; sessões, CSRF e reset tokens são persistidos como hash.
- Endpoints administrativos exigem sessão; mutações existentes exigem CSRF e papéis explícitos.
- CSP/Helmet, CORS restrito, limite JSON de 100 kB e rate limits estão presentes.

Essas confirmações não validam o fluxo de compra completo, pois frete e pagamento estão desabilitados e a suíte PostgreSQL não executou.

## 4. Problemas críticos

### C-01 — Bootstrap do banco está corrompido

**Severidade:** 🔴 CRÍTICO  
**Arquivo:** `database/tables.sql:1-8, 466-496`  
**Causa:** comandos `\set`, `\connect`, `SET ROLE` e delimitadores `$$` foram quebrados em tokens/linhas inválidos (`\`, `set`, `$ $`).  
**Impacto:** um ambiente novo não pode ser criado; testes de integração abortam com PostgreSQL `42601`; disaster recovery e deploy limpo não são reproduzíveis.  
**Como reproduzir:** `npm run test:postgres --workspace backend`; falha em `run-postgres-integration.js:105`.  
**Como corrigir:** restaurar a sintaxe SQL/psql a partir da última revisão íntegra, comparar checksum/conteúdo esperado, recriar um banco descartável do zero e executar todas as migrations e verificações.

### C-02 — Checkout comercial impossível: frete real removido/desabilitado

**Severidade:** 🔴 CRÍTICO  
**Arquivo:** `backend/src/providers/shippingProvider.js:3-10`; `backend/src/config/env.js:41`; `backend/.env.example:15-22`  
**Causa:** o schema só aceita `SHIPPING_PROVIDER=disabled` e o provider sempre retorna 503. Os testes esperam `createConfigurableShippingProvider`, que não existe.  
**Impacto:** não há cotação selecionável, o pedido não pode ser criado e nenhuma venda pode ser concluída.  
**Como reproduzir:** `npm run setup:check` marca Shipping provider como falha; três testes de frete falham.  
**Como corrigir:** reintroduzir provider configurável/transportadora com validação de ambiente, preço autoritativo e testes; impedir start em produção se estiver desabilitado.

### C-03 — Mercado Pago não está implementado no estado atual

**Severidade:** 🔴 CRÍTICO  
**Arquivo:** `backend/src/providers/paymentProvider.js:3-25`; `backend/src/config/env.js:42`; `backend/src/controllers/orderController.js:79-85`  
**Causa:** provider só possui modo `disabled`; `PAYMENT_PROVIDER` não aceita `mercado-pago`; `createMercadoPagoProvider` esperado pelos testes foi removido. O controller também não encaminha `x-request-id`/`data.id` exigidos pelo desenho dos testes de assinatura.  
**Impacto:** criação de pagamento retorna 503; não existe Checkout Pro nem confirmação segura via Mercado Pago. As alegações do README/documentação não correspondem ao código.  
**Como reproduzir:** seis testes ligados a Mercado Pago/frete falham; tentar pagar após um pedido chamaria o provider desabilitado.  
**Como corrigir:** restaurar adapter Mercado Pago server-to-server, validação HMAC, consulta do pagamento, normalização de estados, idempotência e configuração fail-fast; testar sandbox e webhooks reais antes de produção.

### C-04 — Banco novo e banco existente podem divergir sem caminho seguro de reconstrução

**Severidade:** 🔴 CRÍTICO  
**Arquivo:** `database/migrations/001_baseline.sql:1-99`; `database/tables.sql`; `backend/tests/run-postgres-integration.js:101-107`  
**Causa:** a migration 001 apenas valida um schema previamente criado; depende de `tables.sql`, atualmente inválido.  
**Impacto:** não é possível provar restauração a partir de zero; uma perda de banco pode se transformar em perda prolongada de serviço/dados.  
**Como reproduzir:** preparar banco vazio e executar o runner de integração.  
**Como corrigir:** criar bootstrap canônico testável ou transformar a baseline em migration autossuficiente; automatizar teste diário de restore.

## 5. Problemas de alta prioridade

### A-01 — Suite quebrada e integração concorrente não executada

**Arquivo/região:** `frontend/src/layouts/SiteLayout.test.jsx`; `backend/tests/*`; `database/tables.sql`  
**Causa:** testes desatualizados contra componentes/providers atuais e SQL inválido.  
**Impacto:** não há gate confiável contra regressões em segurança, estoque e pagamentos.  
**Reprodução:** `npm run check`: 3/30 falhas frontend e 11/99 falhas backend; build é pulado pelo encadeamento.  
**Correção:** alinhar código e testes, corrigir bootstrap e exigir `npm run check` + integração em CI.

### A-02 — Cancelamento administrativo de pedido pago não repõe nem contabiliza estoque

**Arquivo:** `backend/src/repositories/adminRepository.js:152-180`  
**Causa:** transições permitem `PAID/IN_PRODUCTION → CANCELLED`, mas apenas alteram o status do pedido.  
**Impacto:** estoque físico e movimentos ficam divergentes; não há política explícita de devolução/reembolso.  
**Reprodução:** cancelar pedido pago via API e comparar variante/movimentos.  
**Correção:** definir regra de cancelamento, reembolso e reposição; executar tudo na mesma transação e registrar movimento/auditoria.

### A-03 — Chargeback não muda estado do pedido nem gera ação operacional

**Arquivo:** `backend/src/repositories/paymentRepository.js:157-159`; `database/tables.sql:221-230`  
**Causa:** somente `pagamentos.status` vira `CHARGEBACK`; pedido permanece potencialmente `PAID/SHIPPED`.  
**Impacto:** risco financeiro e fulfillment indevido após contestação.  
**Correção:** modelar estado/flag de disputa, histórico, alerta e bloqueio operacional idempotente.

### A-04 — Endpoint de pagamento não recebe proteção `no-store`

**Arquivo:** `backend/src/routes/orderRoutes.js:20-40`; `backend/src/middlewares/adminSecurity.js:6-9`  
**Causa:** `sensitiveNoStore` só é aplicado às rotas de cliente; pedidos e admin não o aplicam.  
**Impacto:** respostas contendo token de pedido/checkout podem ser cacheadas por intermediários ou navegador; três testes de cache falham.  
**Correção:** aplicar headers `Cache-Control: no-store, private` e `Pragma: no-cache` a autenticação, pedidos, pagamentos e admin.

### A-05 — Interface administrativa promete operações sem endpoints

**Arquivo:** `frontend/src/pages/admin/AdminPage.jsx:14`; `backend/src/routes/adminRoutes.js:35-107`  
**Causa:** UI faz POST para `/admin/categories` e `/admin/collections`, mas backend oferece apenas GET; não há rotas de imagem, exclusão, edição de variantes/categorias/coleções/cursos.  
**Impacto:** operações essenciais retornam 404 ou simplesmente não existem; admin não gerencia a loja completa.  
**Correção:** definir matriz CRUD/RBAC, implementar rotas/serviços/transações/testes e esconder somente capacidades realmente indisponíveis.

### A-06 — Solicitação LGPD visível chama endpoint inexistente

**Arquivo:** `frontend/src/services/api.js:239-245`; `frontend/src/pages/public/CustomerAccountPage.jsx`; `backend/src/routes/customerRoutes.js:34-94`  
**Causa:** há tabela e validator, mas não há rota/controller/repository para `/customers/privacy-requests`.  
**Impacto:** a cliente recebe 404 ao solicitar exclusão, apesar de a interface afirmar que registrará a solicitação.  
**Correção:** implementar fluxo auditável, prazos operacionais e estados, ou remover a promessa até existir.

### A-07 — Configuração de ambiente está truncada e não valida providers usados

**Arquivo:** `backend/src/config/env.js:8-53`; `backend/.env.example:15-51`  
**Causa:** dezenas de variáveis documentadas e consumidas por e-mail/storage/pagamento/frete não pertencem ao schema exportado; valores ficam `undefined`.  
**Impacto:** configuração inválida pode chegar ao runtime e falhar somente durante operação; docs e setup dão falsa confiança.  
**Correção:** schema discriminado por provider, URLs HTTPS em produção, secrets obrigatórios condicionalmente e testes de cada combinação.

### A-08 — Sem pipeline de deploy, migrations, rollback e restore

**Arquivo/região:** repositório raiz e `.github` (não há workflows)  
**Causa:** existem apenas instruções manuais.  
**Impacto:** deploy não repetível, migrations podem ser esquecidas e não há gate automático.  
**Correção:** CI/CD com install lockado, lint, testes, build, migration dry-run, deploy, health/readiness, rollback e teste de backup.

## 6. Problemas médios

- **M-01 — `noindex` é ignorado.** `PageMeta` aceita apenas `title` e `description` (`frontend/src/components/common/PageMeta.jsx:3`); páginas passam `noindex`, mas nenhuma meta robots é criada/removida.
- **M-02 — SEO incompleto.** Sem canonical, sitemap, Twitter Cards, JSON-LD Product/Offer/Organization e URLs OG absolutas. SPA client-side limita indexação consistente.
- **M-03 — Imagens excessivas.** Oito PNGs entre ~1,5 MB e 3,35 MB; custo total superior a 20 MB, sem `srcset/sizes` sistemático.
- **M-04 — Sem code splitting.** Todas as páginas são importadas de forma síncrona; bundle único de 315,66 kB JS.
- **M-05 — Carrinho limpo antes de confirmação.** `CheckoutPage.jsx:60-61` limpa ao obter URL externa; se redirect falhar/usuário voltar, recuperação depende apenas do pedido em sessionStorage.
- **M-06 — Pedido não faz polling apesar de modelo sugerir isso.** Redirect antes do webhook pode deixar tela pendente sem atualização automática.
- **M-07 — Expiração depende de scheduler externo.** A liberação também ocorre em algumas leituras/criações, mas não há scheduler/deploy configurado.
- **M-08 — Reembolso não repõe estoque automaticamente.** O histórico diz que requer revisão, mas não existe fila/tela/alerta operacional demonstrado.
- **M-09 — Admin incompleto.** Não há recuperação de senha administrativa exposta, gestão de usuários/RBAC, clientes, imagens ou fluxo completo de edição/exclusão.
- **M-10 — Upload é código morto operacional.** `imageService` e repository existem sem rota/multipart; limite de 5 MB citado na documentação não está no caminho HTTP atual.
- **M-11 — Métricas/listas sem paginação ampla.** Estoque/cursos/categorias/coleções usam limites fixos ou listas integrais; pode degradar com crescimento.
- **M-12 — Teste SQL é frágil por formatação.** Procura literalmente `numeric(12,2)` e falha com `NUMERIC(12, 2)`, embora o tipo seja correto.
- **M-13 — Teste de ordem espera validação antes da autenticação.** A rota autentica antes do schema e retorna 401, enquanto teste espera 400; contrato precisa ser decidido.
- **M-14 — Políticas legais ainda são conteúdo técnico provisório.** Precisam de validação jurídica e dados reais de controlador/canais/prazos.
- **M-15 — Observabilidade insuficiente.** Logs JSON básicos e audit log parcial; sem métricas, tracing, alertas, correlação de webhook/pagamento nem redaction central comprovada.

## 7. Problemas baixos

- **B-01:** logs vazios antigos permanecem no diretório local, embora ignorados.
- **B-02:** `processo-artesanal-novo.png` aparenta variante antiga pesada ao lado do WebP; confirmar uso e remover/otimizar.
- **B-03:** README afirma Mercado Pago implementado, contrariando o provider atual.
- **B-04:** arquivo `.github/agents/mercado-pago-config.agent.md` não substitui workflow CI e pode induzir interpretação errada da pasta.
- **B-05:** componentes grandes/minificados em uma linha (`AdminPage`, `CustomerAccountPage`) reduzem manutenibilidade e revisão.
- **B-06:** alguns testes de layout mockam `Icons.jsx` de forma incompleta após inclusão de Instagram.

## 8. Segurança

Pontos positivos: queries parametrizadas, Zod `.strict()`, Helmet/CSP, HSTS em produção, frame ancestors bloqueado, CORS por origem, limitação de corpo, rate limit, scrypt, hashes de sessão/CSRF, comparação timing-safe, cookies HttpOnly/Secure e RBAC nas mutações existentes.

Riscos: cache de respostas sensíveis; ausência de implementação real do webhook impede validar sua segurança; configuração condicional incompleta; audit log não cobre todos os fluxos; sem prova de rotação/revogação global de sessões admin após mudança de senha; sem scanner de secrets/SAST/DAST em CI. Não foram encontrados `dangerouslySetInnerHTML`, `eval`, execução de comandos por entrada, SQL concatenado com dados do usuário ou segredo versionado.

## 9. Banco de dados

Não há Prisma. Valores monetários usam `NUMERIC(12, 2)`, com checks de subtotal/total; estoque é `SMALLINT` com constraints de não negatividade e reserva ≤ físico. FKs e índices são extensos. O desenho transacional de reserva usa `FOR UPDATE` e update condicional, adequado para a última unidade.

Bloqueadores: `tables.sql` inválido, baseline não autossuficiente e integração não executável. O banco local existente passa checagem resumida, mas isso não prova que as 12 migrations sejam reproduzíveis hoje.

## 10. Mercado Pago

Status: **não implementado/ativável no código atual**. O repositório de processamento contém boas intenções (event ID único, reconciliação de valor/moeda/referência, consumo transacional de reserva, detecção de pagamento tardio), porém nenhum evento Mercado Pago chega a ele de forma autenticada porque o adapter real não existe. Redirect nunca deve aprovar pedido — e o frontend não o faz — mas o fluxo completo permanece não comprovado.

## 11. Checkout

Preço, frete e estoque são recalculados no backend; campos críticos extras são rejeitados. O fluxo exige conta de cliente e chave idempotente. Está bloqueado pelo frete e pagamento. Clique duplo no mesmo render é mitigado pelo `loading`, e o servidor tem idempotência; refresh antes de criar pedido perde o passo, após criação mantém token em sessionStorage. Falta recuperação explícita do pedido após falha entre criação e criação da preferência.

## 12. Estoque

Reserva e consumo são atômicos no código inspecionado. Locks são ordenados por ID, reduzindo deadlock. Pagamento recusado/cancelado libera reserva. Expiração cancela pedido pendente. Pagamento aprovado tardio é enviado para revisão, evitando venda silenciosa sem reserva. Lacunas: testes concorrentes não rodaram; cancelamento administrativo/reembolso/chargeback não têm ciclo de estoque completo; job externo não está configurado.

## 13. Painel administrativo

Login, logout, sessão, CSRF e RBAC existem para rotas implementadas. Acesso direto sem cookie retorna 401. Funcionalmente, o painel é parcial: listagens e criação produto+variante básica; sem edição pela UI, imagens, clientes, usuários, recuperação admin, categorias/coleções funcionais, curso CRUD, detalhes/ações operacionais completas. Não está pronto para operar uma loja real.

## 14. Frontend

Boa separação de páginas/componentes, estados de loading/erro/vazio em fluxos principais, abort controllers e Error Boundary. Carrinho é persistido localmente mas revalidado no servidor. Falhas: testes responsivos quebrados, ícone do carrinho escondido abaixo de 1080 px, admin e conta chamam endpoints inexistentes, ausência de lazy loading e imagens muito pesadas.

## 15. UX/UI

Há linguagem consistente, feedback acessível (`aria-live`), foco no primeiro campo inválido, skip links e controles com labels. Fatores de abandono: compra impossível por frete/pagamento, exigência de criar conta, carrinho oculto no mobile, quatro etapas antes do gateway, perda visual do carrinho ao abrir pagamento, ausência de recuperação clara após voltar/refresh, admin incompleto e promessas que retornam 404. Acessibilidade visual/contraste não foi validada por browser automatizado nesta rodada; requer axe + teste teclado em ambiente executável.

## 16. Performance

Bundle JS aceitável para início, mas sem chunks por rota. O maior risco são imagens PNG de múltiplos megabytes. Catálogo possui paginação, queries agregadas e índices; não foi observado N+1 óbvio no catálogo. Admin busca itens/histórico/reservas em paralelo. Recomenda-se CDN, AVIF/WebP responsivo, dimensões explícitas, lazy loading abaixo da dobra, cache HTTP e budget Lighthouse.

## 17. SEO

Title e description mudam por página; robots.txt existe. Faltam canonical, sitemap, OG URL/imagem absoluta, Twitter Cards, JSON-LD e SSR/prerender. `noindex` não funciona. Para e-commerce, implementar `Product`, `Offer`, disponibilidade, preço/moeda e `Organization`, derivados dos dados autoritativos.

## 18. LGPD

Dados: nome, e-mail, telefone, endereços, pedidos, IP/user-agent em hash, tokens e logs. Há política e tabela de solicitações, mas o endpoint não existe. Definir minimização, base/consentimento com jurídico, retenção por categoria, exportação/correção/exclusão, anonimização compatível com obrigações fiscais, inventário de subprocessadores e política de cookies. Não registrar endereço, token, segredo ou payload bruto sensível em logs.

## 19. Testes executados

| Comando | Resultado | Erros/warnings |
|---|---|---|
| `npm run lint` (via check) | Passou | sem erro reportado |
| `npm run test` | Falhou | frontend 27/30; backend unitário 88/99 |
| `npm run test:postgres --workspace backend` | Falhou antes das suítes | SQLSTATE 42601 em `tables.sql` |
| `npm run build` | Passou | JS 315,66 kB; CSS 30,29 kB |
| `npm audit --json` | Passou | 0 vulnerabilidades / 382 dependências |
| `npm run setup:check` | Falhou | frete desabilitado; e-mail/storage em warning |
| `npm run db:status` | Passou localmente | conexão e schema atual válidos; apenas 6 tabelas runtime checadas pelo script |

## 20. Testes que ainda precisam ser criados

**P0:** bootstrap do zero; restore; Mercado Pago sandbox; assinatura real; webhook duplicado/fora de ordem; aprovação após expiração; dois compradores/última unidade; idempotência concorrente de pagamento; cancelamento/refund/chargeback com estoque.  
**P1:** matriz completa RBAC/CSRF; CRUD admin; endpoints inexistentes; reset admin; upload hostil; cache de dados sensíveis; configuração production fail-fast.  
**P2:** E2E mobile/desktop (catálogo→checkout→retorno), teclado/axe, links, 404/API down, SEO renderizado, Lighthouse e carga do catálogo/webhook.

## 21. Código morto ou arquivos desnecessários

- `backend/src/services/imageService.js` e métodos `addImage/deleteImage`: sem rota consumidora.
- `frontend/src/services/api.js:239-245`: consumidor sem endpoint.
- Formulários de criação de categoria/coleção no admin: consumidores sem rota.
- `frontend/public/images/processo-artesanal-novo.png`: candidato a asset antigo/duplicado; confirmar antes de excluir.
- Logs locais vazios são artefatos ignorados, não versionados.

## 22. Dependências

Lockfile consistente o suficiente para build/test; `npm audit` encontrou zero advisories. Node requerido é ≥22 e execução ocorreu em Node 24.18.1. Não há dependência Prisma nem SDK Mercado Pago. A ausência do SDK não é por si só um bug (fetch direto seria válido), mas o adapter também não existe. Atualização major do npm foi apenas aviso externo e não deve ser feita automaticamente.

## 23. Deploy

**Não preparado.** Falta plataforma/configuração declarativa, CI/CD, frete, pagamento, storage/e-mail definitivos, migration reproduzível, teste de restore, scheduler, observabilidade e rollback. HTTPS/CORS/proxy estão previstos em código/docs, não comprovados em hospedagem.

## 24. Pendências externas

- Credenciais e validação sandbox/produção do Mercado Pago.
- Transportadora/regra comercial de frete e dados de embalagem/origem.
- Domínio, DNS, certificados, hospedagem frontend/API e PostgreSQL gerenciado.
- Storage/CDN, e-mail transacional, SPF/DKIM/DMARC.
- Backups/PITR, monitoramento, alertas e scheduler.
- Textos e decisões de retenção/privacidade validados por jurídico/cliente.

Esses itens externos não são bugs; são bloqueadores de lançamento. A remoção dos providers e o SQL inválido são bugs de código.

## 25. Nota geral do projeto

| Área | Nota |
|---|---:|
| Arquitetura | 6,0 |
| Frontend | 6,0 |
| Backend | 5,0 |
| Banco | 4,0 |
| Segurança | 6,0 |
| Checkout | 3,0 |
| Mercado Pago | 1,0 |
| Estoque | 5,0 |
| Admin | 3,5 |
| UX/UI | 5,5 |
| Performance | 5,0 |
| SEO | 3,0 |
| Testes | 4,0 |
| Produção | 1,5 |

## 26. Status final

### 🔴 NÃO ESTÁ PRONTO PARA PRODUÇÃO

Motivo técnico: não é possível concluir compra; Mercado Pago e frete estão desabilitados no código, o banco não pode ser reconstruído a partir dos arquivos atuais, a suíte falha e fluxos administrativos/LGPD expostos estão incompletos. Publicar neste estado causaria indisponibilidade comercial e risco operacional/financeiro.

## 27. Plano de correção

### FASE 0 — Problemas críticos

**Problema:** SQL corrompido e providers removidos.  
**Arquivos:** `database/tables.sql`, `env.js`, `shippingProvider.js`, `paymentProvider.js`, webhook/controller.  
**Solução:** restaurar versões íntegras com revisão de segurança e executar bootstrap/sandbox.  
**Riscos:** alterar migration aplicada; usar credencial real em teste.  
**Dependências:** banco descartável e credenciais sandbox.  
**Testes:** criação zero, migrations, frete, preferência, assinatura, reconciliação.  
**Concluída quando:** checkout sandbox completo e todas as suítes P0 passam.

### FASE 1 — Segurança

**Problema:** cache sensível, configuração incompleta e cobertura/auditoria parcial.  
**Arquivos:** middlewares, rotas admin/customer/order, `env.js`, logger.  
**Solução:** no-store global por escopo sensível, schema discriminado, redaction, auditoria e CI security.  
**Riscos:** bloquear origens/cookies legítimos.  
**Dependências:** URLs finais.  
**Testes:** CORS, CSRF, RBAC, cookies, cache, brute force, secrets.  
**Concluída quando:** matriz OWASP aplicável passa e produção falha fechada.

### FASE 2 — Banco e integridade dos dados

**Problema:** baseline dependente e restore não comprovado.  
**Arquivos:** SQL, migration runner, testes PostgreSQL.  
**Solução:** fonte canônica reproduzível, constraints e restore automatizado.  
**Riscos:** drift com banco existente.  
**Dependências:** snapshot/backup verificado.  
**Testes:** zero→latest, checksum, rollback, restore.  
**Concluída quando:** banco descartável e restore de backup passam automaticamente.

### FASE 3 — Produtos e estoque

**Problema:** CRUD/imagens parciais e pós-venda inconsistente.  
**Arquivos:** admin routes/controllers/repositories, image service, payment/admin repositories.  
**Solução:** CRUD transacional, storage, política de cancelamento/refund/chargeback e movimentos.  
**Riscos:** dupla reposição.  
**Dependências:** storage e regra comercial.  
**Testes:** variantes/SKU/imagens, concorrência, devoluções idempotentes.  
**Concluída quando:** invariantes físico/reservado/vendido fecham em todos os estados.

### FASE 4 — Carrinho e checkout

**Problema:** recuperação frágil e providers ausentes.  
**Arquivos:** Cart/Checkout, services e order/payment APIs.  
**Solução:** recuperar pedido em andamento, não perder carrinho prematuramente, estados claros e retry idempotente.  
**Riscos:** pedidos duplicados.  
**Dependências:** fases 0 e 3.  
**Testes:** refresh/back/duplo clique/API down/preço/estoque alterados.  
**Concluída quando:** E2E resiliente passa em mobile e desktop.

### FASE 5 — Mercado Pago

**Problema:** adapter inexistente.  
**Arquivos:** provider, env, controller, service, repository e docs.  
**Solução:** Checkout Pro server-side, HMAC, consulta server-to-server, estados e reconciliação.  
**Riscos:** pagamento falso, duplicidade e eventos tardios.  
**Dependências:** sandbox/webhook HTTPS.  
**Testes:** aprovado/recusado/pendente/cancelado/refund/chargeback/duplicado/fora de ordem.  
**Concluída quando:** nenhum redirect aprova pedido e sandbox reconciliado passa.

### FASE 6 — Painel administrativo

**Problema:** operação parcial e UI/API divergentes.  
**Arquivos:** `AdminPage`, admin routes/controllers/repositories/validators.  
**Solução:** matriz de capacidades, CRUD completo, detalhes, usuários, imagens e filas de exceção.  
**Riscos:** ampliar superfície privilegiada.  
**Dependências:** RBAC definido.  
**Testes:** cada papel, CSRF e auditoria.  
**Concluída quando:** operação diária não exige acesso direto ao banco.

### FASE 7 — Frontend e UX/UI

**Problema:** carrinho mobile oculto, endpoints falsos e abandono.  
**Arquivos:** layout/CSS, páginas cliente/admin/checkout.  
**Solução:** corrigir navegação, feedback, recuperação e acessibilidade.  
**Riscos:** regressão responsiva.  
**Dependências:** APIs completas.  
**Testes:** viewport, teclado, axe e usuários reais.  
**Concluída quando:** jornadas críticas passam sem beco sem saída.

### FASE 8 — Testes

**Problema:** 14 falhas e ausência de gate.  
**Arquivos:** suites frontend/backend e CI.  
**Solução:** corrigir contrato, adicionar P0/P1 e cobertura E2E.  
**Riscos:** testes que só validam mocks.  
**Dependências:** ambiente efêmero.  
**Testes:** toda a matriz da seção 20.  
**Concluída quando:** `npm ci && npm run check` + PostgreSQL/E2E passam em CI.

### FASE 9 — Performance e SEO

**Problema:** imagens grandes, bundle único e metadados incompletos.  
**Arquivos:** assets, rotas, `PageMeta`, HTML/public.  
**Solução:** imagens responsivas, lazy chunks, sitemap/canonical/JSON-LD e prerender.  
**Riscos:** indexar páginas privadas ou schema desatualizado.  
**Dependências:** domínio/dados reais.  
**Testes:** Lighthouse, rich results, robots/noindex.  
**Concluída quando:** budgets e validações SEO passam.

### FASE 10 — Preparação para produção

**Problema:** infraestrutura apenas documental.  
**Arquivos:** novos manifests/workflows/runbooks.  
**Solução:** IaC/config declarativa, migrations controladas, health, backup, alertas e rollback.  
**Riscos:** mudança irreversível de dados/DNS.  
**Dependências:** fornecedores e credenciais.  
**Testes:** staging, smoke, restore, rollback e carga.  
**Concluída quando:** checklist de go-live assinado e exercício de rollback/restore aprovado.

## 28. Inventário resumido por pasta

- `frontend/`: 1 app, 2 componentes comerciais, componentes comuns, 2 contexts, 1 layout, 18 páginas públicas, 1 página admin, 8 arquivos de teste, CSS e 12 assets públicos.
- `backend/`: app/server, 10 routers, 9 controllers, 9 services, 9 repositories, 5 providers, 7 validators, 7 middlewares/security/config/database, 7 scripts e 31 arquivos de teste.
- `database/`: bootstrap, tabelas, índices, permissões, verificação, seeds e migrations 001–012.
- `docs/`: documentação de fases, API, banco, Mercado Pago, produção e auditorias anteriores.
- `.github/`: somente um arquivo de instrução de agente; nenhum workflow.
- raiz: workspaces npm, lockfile, README, gitignore e logs locais ignorados.

## 29. Limitações e evidências não comprovadas

- Não foi realizado pagamento real nem sandbox porque não há provider executável.
- Não foi realizado teste visual em navegador, Lighthouse ou axe porque o fluxo dependente de providers está bloqueado; a análise UX/UI foi estrutural e baseada em código/testes.
- O banco local existente está conectado, mas o teste destrutivo foi direcionado apenas ao banco `_test`; ele falhou com segurança antes das suites.
- Serviços externos, DNS, backups e hospedagem não podem ser confirmados pelo repositório.
