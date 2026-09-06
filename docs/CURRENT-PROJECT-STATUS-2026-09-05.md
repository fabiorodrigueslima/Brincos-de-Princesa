# Status atual do projeto — Brinco de Princesa

**Data:** 05/09/2026
**Escopo:** diagnóstico do código atual, sem correções de aplicação nesta auditoria.

## Resumo executivo

A base interna está em bom estado de desenvolvimento: lint, build, testes frontend, testes unitários backend e integração PostgreSQL passaram. O catálogo, carrinho, autenticação, persistência de pedidos, reservas concorrentes e controles de segurança têm implementação real e cobertura automatizada.

A loja ainda não está pronta para publicação comercial. Há bloqueios funcionais no caminho de uso real:

- a preferência do Mercado Pago retorna para `/pedido/:code`, mas essa rota não está registrada no `frontend/src/App.jsx`;
- `AdminPage.jsx` existe, mas não está montado no roteamento principal do frontend;
- Cloudinary existe como adapter e está testado somente com mocks, sem homologação externa;
- SuperFrete existe como adapter, mas não foi validado contra a API real;
- Mercado Pago possui adapter e testes internos, mas não houve compra real/sandbox externo;
- setup check local reporta storage e e-mail como avisos, e o ambiente real de produção ainda depende de credenciais e infraestrutura externas;
- o rollback de imagem após falha de persistência usa a chave temporária em vez do `public_id` retornado pelo Cloudinary, com risco de asset órfão.

## Resultados executados

| Comando | Resultado |
|---|---|
| `npm run lint` | Passou frontend e backend |
| `npm test` | Passou |
| `npm run build` | Passou |
| `git diff --check` | Passou, apenas avisos de conversão LF/CRLF do Git |
| `npm run setup:check --workspace backend` | Executou; avisos de e-mail e storage |
| `npm run db:status --workspace backend` | Conectado; schema válido |

Contagens reais:

- Frontend: **30 testes**
- Backend unitário: **119 testes**
- Integração/PostgreSQL: **29 testes**
- Total único: **178 testes**
- Falhas: **0**
- Skipped: **0**

Os testes são principalmente unitários/API e integração de banco. Não houve E2E de navegador, compra real, upload real Cloudinary ou webhook real Mercado Pago/SuperFrete.

## Tabela principal

| Área | Status | O que funciona | O que falta ou limita |
|---|---|---|---|
| Home | ✅ FUNCIONANDO E VALIDADO | Rota e componente existem; build e testes frontend passam | Não houve E2E visual em navegador |
| Catálogo | ✅ FUNCIONANDO E VALIDADO | Listagem, paginação, filtros e consulta API implementados | Homologação visual/end-to-end ainda não executada |
| Busca | ✅ FUNCIONANDO E VALIDADO | Busca por parâmetros do catálogo e API parametrizada | Não há teste E2E de interação no browser |
| Categorias | ✅ FUNCIONANDO E VALIDADO | Rotas públicas, API e CRUD backend existem | UI administrativa é limitada |
| Coleções | ✅ FUNCIONANDO E VALIDADO | Listagem pública, detalhes e API existem | UI administrativa é limitada |
| Página de produto | ✅ FUNCIONANDO E VALIDADO | Variantes, preço, estoque e imagens são carregados | Sem validação externa de assets Cloudinary |
| Variantes | ✅ FUNCIONANDO E VALIDADO | SKU, preço, estoque e disponibilidade no backend | Edição é API/admin parcial |
| Imagens | 🟡 PARCIALMENTE FUNCIONANDO | MIME, magic bytes, limite de 5 MB, URL, `storage_key` e principal existem | Cloudinary real não validado; rollback pode deixar asset órfão |
| Carrinho | ✅ FUNCIONANDO E VALIDADO | Adicionar, atualizar, remover, limpar, persistência local e revalidação server-side | Não reserva estoque, como projetado |
| CEP | ⚠️ IMPLEMENTADO, MAS AINDA NÃO VALIDADO EXTERNAMENTE | Provider BrasilAPI, fallback para preenchimento manual e testes internos | API externa real não foi homologada |
| Frete | 🟡 PARCIALMENTE FUNCIONANDO | Provider configurável e adapter SuperFrete; checkout revalida opção/preço | SuperFrete real não foi validado; configurable é tabela interna |
| Checkout | 🟡 PARCIALMENTE FUNCIONANDO | Valida carrinho, endereço, cotação, pedido, idempotência e pagamento | Fluxo final de retorno quebra na rota de pedido ausente; gateway externo não validado |
| Página de pagamento | ⚠️ IMPLEMENTADO, MAS AINDA NÃO VALIDADO EXTERNAMENTE | Checkout Pro e redirect são implementados | Sem preferência real/sandbox validada |
| Página de sucesso/pedido | ❌ NÃO FUNCIONANDO / NÃO IMPLEMENTADO | `OrderPage.jsx` existe | `/pedido/:code` não está registrado em `App.jsx`; retorno termina em 404 |
| Pagamento pendente | 🟡 PARCIALMENTE FUNCIONANDO | Estado, labels e consulta protegida existem | Sem polling ativo; rota de pedido ausente |
| Pagamento recusado | 🟡 PARCIALMENTE FUNCIONANDO | Mapeamento de status e cancelamento/liberação existem | Sem teste externo e sem retorno funcional pela rota ausente |
| Responsividade/mobile | 🟡 PARCIALMENTE FUNCIONANDO | CSS e testes de header/cart existem | Sem E2E mobile/axe; não há comprovação de todas as páginas |
| Página 404 | ✅ FUNCIONANDO E VALIDADO | Rota `*` existe | Apenas testes indiretos/build |
| Admin login/logout | ✅ FUNCIONANDO E VALIDADO | Sessão, cookies, CSRF, rate limit e testes de API | `AdminPage` não está montado no App principal |
| Admin sessão/RBAC | ✅ FUNCIONANDO E VALIDADO | Middleware e papéis protegendo endpoints; testes passam | Uso visual depende de rota/admin shell ausente |
| Admin produtos | 🟡 PARCIALMENTE FUNCIONANDO | API de criação, edição, arquivamento e variantes existe | Frontend só cobre criação/listagem; sem UI completa de edição/exclusão |
| Admin categorias/coleções | ✅ FUNCIONANDO E VALIDADO | CRUD backend e testes de API existem | Painel frontend não está acessível pelo App principal |
| Admin variantes | 🟡 PARCIALMENTE FUNCIONANDO | API de criação, edição e desativação | UI completa não existe |
| Admin estoque | ✅ FUNCIONANDO E VALIDADO | Ajuste, reserva, liberação, saldo e concorrência testados | Operação visual depende do painel não montado |
| Admin imagens | 🟡 PARCIALMENTE FUNCIONANDO | Rota, service, provider e repository existem | Não há UI integrada; Cloudinary real não validado |
| Admin pedidos | ✅ FUNCIONANDO E VALIDADO | Consulta e transições protegidas; testes API/integrados | Fluxos de refund/chargeback requerem operação externa |
| Clientes/LGPD | ✅ FUNCIONANDO E VALIDADO | Conta, endereços, privacidade e teste PostgreSQL existem | Política operacional/jurídica ainda depende da cliente |
| Produtos sem estoque | ✅ FUNCIONANDO E VALIDADO | Disponibilidade é calculada por variante e testes de concorrência passam | Não houve E2E de compra indisponível |
| Banco PostgreSQL | ✅ FUNCIONANDO E VALIDADO | Migrations, seed, constraints, índices, rollback e integrações passam | Backup/PITR/restore operacional não foram testados |
| Mercado Pago | ⚠️ IMPLEMENTADO, MAS AINDA NÃO VALIDADO EXTERNAMENTE | Provider, preferência, idempotência, back URLs, assinatura, consulta server-side e estados existem | Sem credenciais/teste real; retorno frontend quebrado por rota ausente |
| Cloudinary | ⚠️ IMPLEMENTADO, MAS AINDA NÃO VALIDADO EXTERNAMENTE | Adapter assinado, `secure_url`, `public_id`, `storage_key`, exclusão e testes mockados | Sem conta/credenciais/upload real; possível órfão no rollback |
| CI | ✅ FUNCIONANDO E VALIDADO | Workflow instala, linta, testa, usa PostgreSQL e builda | Não faz deploy |
| Deploy | ❌ NÃO FUNCIONANDO / NÃO IMPLEMENTADO | Documentação operacional existe | Não há plataforma/CD, domínio, HTTPS, rollback e observabilidade configurados |

## Frontend

### Rotas e navegação

O frontend possui rotas para home, loja, categorias, coleções, produto, cursos, carrinho, checkout, autenticação, conta, páginas legais e 404. A rota de pedido está ausente.

O componente `OrderPage.jsx` existe, mas o `App.jsx` não registra `pedido/:code`. As `back_urls` do Mercado Pago apontam para essa URL. Após o retorno do gateway, o usuário encontra 404 em vez da página do pedido.

`AdminPage.jsx` também existe, mas não aparece no roteamento principal do `App.jsx`. A API administrativa existe e é testada; o painel visual não é acessível pela aplicação pública atual.

### Carrinho

O carrinho mantém itens no `localStorage`, sanitiza quantidade, permite adicionar, alterar, remover e limpar. A página consulta `/cart/validate`, recompõe preço e mostra disponibilidade. O servidor não confia no preço do navegador e não reserva estoque nessa etapa.

Status: **✅ FUNCIONANDO E VALIDADO** para contratos internos; não houve teste E2E de navegador.

### Checkout

Fluxo implementado:

`produto -> carrinho -> login/cadastro -> dados -> CEP/endereço -> cotação -> escolha de frete -> pedido -> preferência Mercado Pago -> redirect externo`

A criação de pedido exige cotação selecionada e chave de idempotência. O preço, estoque e frete são recalculados no backend.

O fluxo para depois do redirect quando o Mercado Pago retorna para `/pedido/:code`, porque a rota não está registrada. Antes disso, o pedido e a preferência são criados apenas se os providers externos estiverem configurados.

## Painel administrativo

A API possui login, logout, sessão, CSRF, RBAC, dashboard, produtos, variantes, categorias, coleções, estoque, pedidos, imagens e configurações. Os testes de segurança e API passam.

O painel frontend existe em `AdminPage.jsx`, mas não é incluído em `App.jsx`. Além disso, o componente cobre criação/listagem básica, não uma operação completa de edição, imagens, clientes ou todos os fluxos de pedido.

## Produtos e catálogo

O backend possui criação/edição/arquivamento de produtos, variantes, SKU, preço, preço promocional, estoque, categorias e coleções. O catálogo público filtra produtos ativos e variantes ativas, e o estoque disponível é calculado como físico menos reservado.

Produtos sem estoque permanecem consultáveis, mas não ficam disponíveis para compra. Isso é coberto por testes de carrinho/estoque e integração PostgreSQL.

## Imagens e Cloudinary

O adapter Cloudinary existe em `storageProvider.js` e:

- assina parâmetros no backend;
- envia multipart para a API de upload;
- usa `CLOUDINARY_FOLDER` lógico;
- recebe `secure_url`;
- persiste o `public_id` em `produto_imagens.storage_key`;
- exclui via endpoint `image/destroy`;
- não expõe API Secret ao frontend.

A rota limita uploads a JPEG, PNG e WebP, com limite de 5 MB e validação de magic bytes. A tabela existente e a migration 009 suportam `storage_key`; não foi necessária migration adicional.

O código foi testado com `fetch` mockado. Não houve conta/credencial/upload real. Portanto Cloudinary é **⚠️ IMPLEMENTADO, MAS AINDA NÃO VALIDADO EXTERNAMENTE**.

Risco conhecido: se o upload remoto for concluído e `adminRepository.addImage` falhar, `imageService` tenta excluir usando a chave temporária com extensão, não o `providerAssetId` retornado pelo Cloudinary. Isso pode deixar asset órfão.

## Estoque

O estoque por variante, reservas, release, consumo e idempotência são implementados no repository transacional. Os testes PostgreSQL comprovam:

- rollback quando preço autoritativo muda;
- rollback após falha intermediária;
- expiração e liberação idempotente;
- apenas uma reserva para a última unidade;
- limite de reservas sob compradores concorrentes;
- replay da mesma requisição idempotente;
- confirmação única de estoque em evento autenticado e retry.

Cancelamento administrativo de pedidos pagos, refund e chargeback exigem revisão operacional. O webhook atual muda o status de pagamento/pedido para refund ou chargeback, mas registra que a reposição de estoque requer revisão.

Status: **✅ FUNCIONANDO E VALIDADO** para os cenários internos testados; operação financeira real ainda não validada.

## Mercado Pago

O provider implementa Checkout Pro, itens, `external_reference`, `X-Idempotency-Key`, `back_urls`, `notification_url`, consulta server-to-server, assinatura HMAC e mapeamento de estados.

Os testes internos cobrem payloads, assinatura e respostas simuladas. Não comprovam credencial, preferência, webhook ou pagamento real/sandbox externo.

Status: **⚠️ IMPLEMENTADO, MAS AINDA NÃO VALIDADO EXTERNAMENTE**.

Bloqueio adicional: as URLs retornam a rota frontend ausente `/pedido/:code`.

## Frete

Existem dois modos:

- `configurable`: tabela fixa interna, limite de frete grátis opcional, UFs permitidas e retirada local opcional;
- `superfrete`: adapter que monta cotação externa usando CEP de origem, destino, serviços, peso e dimensões.

A implementação SuperFrete exige peso e dimensões físicas dos itens e normaliza preço/prazo retornados. Porém não houve chamada real contra a API SuperFrete. O endpoint, autenticação, formato de resposta, CEP de origem, serviços e regras comerciais ainda precisam de homologação.

Não existe integração Correios real. A cliente não possui contrato direto.

O checkout revalida a cotação e a opção escolhida no backend. O preço e prazo não vêm confiavelmente do frontend.

Status: **⚠️ IMPLEMENTADO, MAS AINDA NÃO VALIDADO EXTERNAMENTE** para SuperFrete; `configurable` é **✅ FUNCIONANDO E VALIDADO** como tabela interna de teste/desenvolvimento, não como frete real.

## Banco PostgreSQL

A criação/migration isolada, checksum, rollback, seed, catálogo, admin, cursos, pedidos, privacidade e concorrência passaram nos testes PostgreSQL.

O banco local respondeu:

- conectado;
- schema válido;
- usuário runtime limitado;
- categorias ativas presentes.

Índices, constraints de estoque, integridade de pedidos e `produto_imagens.storage_key` existem. Não foi validado backup, restore, PITR, failover ou banco gerenciado de produção.

## Autenticação e segurança

Confirmado internamente:

- senhas com scrypt e salt;
- sessões e CSRF armazenados como hash;
- cookies HttpOnly/Secure conforme ambiente;
- CORS por allowlist;
- Helmet/CSP;
- rate limiting;
- Zod strict;
- queries parametrizadas;
- RBAC administrativo;
- CSRF em mutações administrativas e de cliente;
- `no-store` em rotas sensíveis;
- fail-fast de Mercado Pago, SuperFrete e Cloudinary em produção;
- nenhum segredo real incluído no relatório.

A segurança de integrações externas, domínio, proxy, secret manager, webhook real e storage real ainda não foi validada operacionalmente.

## LGPD

Há autenticação de cliente, perfil, endereços, solicitações de privacidade, persistência e teste PostgreSQL. A exclusão/anonymização precisa ser definida com jurídico e contabilidade para respeitar retenção fiscal, prazos e base legal.

Status: **✅ FUNCIONANDO E VALIDADO** tecnicamente; política operacional/jurídica permanece dependente da cliente.

## Configuração de produção

O schema exige em produção:

- PostgreSQL;
- Mercado Pago e credenciais;
- SuperFrete e credenciais/CEP;
- Cloudinary e credenciais;
- URLs públicas;
- provider de storage `cloudinary`.

Development/test permitem providers locais ou desabilitados conforme os testes. O `.env.example` não contém segredos reais.

O `setupCheck` importa `env` centralizado. No ambiente local atual, executou com avisos de e-mail e storage. Isso indica que o ambiente local não deve ser tratado como prova de readiness de produção.

## CI/CD e deploy

Existe CI para Node, lint, testes, PostgreSQL e build. Não há CD/deploy declarativo, domínio, HTTPS, rollback, backup automatizado, scheduler de expiração, monitoramento ou alertas configurados no repositório.

## Dependências da cliente

- Conta Cloudinary.
- Cloud name, API key e API secret fornecidos por canal seguro.
- Política de pasta, transformações, qualidade, CDN e retenção de imagens.
- Conta/token SuperFrete.
- CEP de origem real.
- Serviços contratados e regras de prazo.
- Peso e dimensões reais de cada variante/produto.
- Dimensões e regras de embalagem.
- Política de frete grátis.
- Política de retirada presencial, se aplicável.
- Conta Mercado Pago e credenciais de sandbox/produção.
- Domínio da loja e domínio/API.
- E-mail transacional e remetente verificado.
- Dados legais, controlador, canais LGPD e políticas comerciais.

## Dependências externas

- Cloudinary: upload, CDN e exclusão reais.
- Mercado Pago: preferência, pagamento, webhook e estados reais.
- SuperFrete: cotação, prazo, autenticação e contrato.
- PostgreSQL hospedado, TLS, backup/PITR e restore.
- Domínio, DNS e HTTPS.
- Provedor de e-mail transacional.
- Secret manager.
- Scheduler para expiração de reservas e envio de e-mails.
- Monitoramento, logs, alertas e observabilidade.

## ✅ O QUE JÁ ESTÁ PRONTO

- Catálogo backend e frontend em build/testes.
- Carrinho local com revalidação server-side.
- Autenticação de cliente e admin testada.
- RBAC, CSRF, cookies e rate limits testados.
- Banco, migrations, seed e concorrência PostgreSQL testados.
- Reserva/liberação/idempotência de estoque nos cenários cobertos.
- API de produtos, variantes, categorias, coleções e pedidos.
- LGPD técnica com endpoint e teste PostgreSQL.
- CI de lint, testes, PostgreSQL e build.
- Validação fail-fast de configuração de produção.

## ⚠️ O QUE ESTÁ PRONTO NO CÓDIGO MAS FALTA TESTAR COM SERVIÇO REAL

- Cloudinary.
- Mercado Pago.
- SuperFrete.
- BrasilAPI/consulta externa de CEP.
- PostgreSQL hospedado e restore operacional.
- E-mail transacional.
- CDN/URLs públicas em domínio real.

## 🟡 O QUE ESTÁ PARCIAL

- Checkout: cria pedido/preferência internamente, mas o retorno frontend cai em rota ausente.
- Admin: API ampla, UI existente porém não montada no App e incompleta para operação diária.
- Imagens: adapter e persistência existem; falta homologação real e corrigir o risco de rollback órfão.
- Frete: adapter SuperFrete existe, mas a cotação real e regras comerciais não foram comprovadas.
- Status de refund/chargeback: estados existem, mas ações operacionais de estoque/reembolso requerem procedimento externo.
- E-mail: outbox/job existem, provider está desabilitado.
- Deploy: CI existe, mas não há CD nem infraestrutura declarativa.

## ❌ O QUE AINDA PRECISA SER FEITO

1. Registrar e testar a rota frontend `/pedido/:code`.
2. Tornar o AdminPage acessível por rota/entrada protegida.
3. Homologar Cloudinary real, incluindo upload, URL, frontend e exclusão.
4. Corrigir/validar o rollback de asset Cloudinary usando o `public_id` correto.
5. Homologar SuperFrete com credenciais, CEP, peso, dimensões e embalagem reais.
6. Homologar Mercado Pago em sandbox com webhook acessível por HTTPS.
7. Configurar e-mail transacional e jobs.
8. Provisionar PostgreSQL de produção com backup/PITR/restore testado.
9. Provisionar domínio, HTTPS, frontend e backend.
10. Definir CI/CD, rollback, scheduler, logs, métricas e alertas.
11. Executar E2E desktop/mobile e acessibilidade.
12. Validar políticas legais, frete, troca, devolução e LGPD com a cliente/jurídico.

## Prioridade

### PRIORIDADE 1 — Impede venda

- Corrigir rota de retorno/pedido ausente.
- Homologar Mercado Pago e webhook.
- Homologar SuperFrete ou definir operação temporária de frete real.
- Configurar Cloudinary se houver cadastro/gestão de produtos com imagens.
- Confirmar domínio HTTPS público.

### PRIORIDADE 2 — Necessário para produção

- Disponibilizar painel admin real.
- Configurar PostgreSQL gerenciado, backup e restore.
- Configurar e-mail transacional.
- Configurar jobs de expiração/outbox.
- Corrigir rollback de assets Cloudinary.
- Definir observabilidade, secret manager e rollback de deploy.

### PRIORIDADE 3 — Melhoria importante

- E2E mobile/desktop e axe.
- Polling/atualização da página de pedido.
- Code splitting e otimização de imagens.
- CRUD visual completo de produtos, variantes e imagens.
- Operação de refund/chargeback e alertas.

### PRIORIDADE 4 — Pode ficar para depois

- Transformações avançadas Cloudinary.
- Sitemap/prerender/SEO avançado.
- Métricas e otimizações de performance não críticas.
- Melhorias visuais do painel.

## Status geral

### Código

🟡 **QUASE PRONTO**

A base de código e testes é consistente, mas existem bloqueios internos de uso: rota de pedido ausente, painel não montado e risco de cleanup Cloudinary.

### Go-live

🔴 **BLOQUEADO**

Além dos bloqueios internos, Mercado Pago, SuperFrete, Cloudinary, domínio, HTTPS, banco de produção, e-mail e observabilidade ainda não foram validados/configurados no ambiente final.

## Se publicar hoje, o que o cliente consegue fazer?

O cliente consegue:

`entrar na loja`
→ `navegar pela home e catálogo`
→ `abrir categorias, coleções e produtos`
→ `selecionar variantes`
→ `adicionar, alterar e remover itens do carrinho`
→ `ter preço e disponibilidade revalidados pelo backend`
→ `entrar/cadastrar uma conta`
→ `preencher endereço e consultar CEP`
→ `solicitar uma cotação conforme o provider configurado`
→ `selecionar a entrega`
→ `criar um pedido`
→ `receber uma URL de pagamento se o Mercado Pago estiver configurado`.

O fluxo deixa de ser confiável na integração final:

- se o provider externo não estiver configurado/homologado, a cotação ou pagamento falha;
- se a preferência for criada, o usuário é enviado ao Mercado Pago;
- após o retorno, o Mercado Pago aponta para `/pedido/:code`;
- essa rota não existe no `App.jsx`, então o cliente termina em 404;
- a confirmação de pagamento depende do webhook real e não da página de retorno;
- sem Cloudinary real, o upload administrativo não está operacional;
- o painel administrativo visual não está acessível pelo roteamento principal.

Conclusão prática: o catálogo e o carrinho estão utilizáveis, mas a loja não deve receber tráfego comercial real até corrigir o retorno do pedido e homologar pagamento, frete, storage e infraestrutura.
