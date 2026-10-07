# Relatório técnico — preparação para produção

## Veredito

**🟡 PRONTO PARA HOMOLOGAÇÃO**. Verificações locais concluídas com sucesso. Código e configuração preparados para Vercel Services; infraestrutura e integrações reais ainda não homologadas. Não houve push, deploy, acesso a banco de produção, uso de credenciais reais, pagamento ou envio de e-mail real.

## Preservação e escopo

O estado original, inclusive arquivos modificados e não versionados, está registrado em [PRE-DEPLOY-STATE-2026-10-06.md](PRE-DEPLOY-STATE-2026-10-06.md). Foi feito backup local de código, sem `.env`. Não houve reset, limpeza destrutiva ou substituição de alterações anteriores. A migration 014 e funcionalidades de ativação/controle de checkout já eram trabalho existente e foram preservadas.

A revisão cobriu workspaces, frontend, backend, SQL/migrations, CI, configurações, integrações, rotas, cookies, CSRF, autorização, limites de acesso, uploads e filas. Foram examinadas referências de desenvolvimento (`localhost`, sandbox e armazenamento local), chamadas externas, temporizadores, logs e marcadores de implementação. As referências locais restantes pertencem ao desenvolvimento, exemplos ou testes; produção recusa URLs públicas locais e provedores desabilitados. Não há Prisma, WebSocket nem dependência de armazenamento de uploads em disco na arquitetura de produção.

## Resultado por área

| Área | Correções e comportamento final |
|---|---|
| Vercel | Dois Services no mesmo domínio; API com prioridade e caminho preservado, SPA com fallback, Node 24, Fluid, maxDuration 300 e dois crons autenticados. Schema oficial validado localmente. |
| Frontend | API relativa por padrão, rejeição de localhost em produção, CSRF ao criar pedido, tentativa de checkout estável durante falhas, conferência do total, upload direto administrativo e texto de checkout corrigido. |
| Express | Exportação default do app para a plataforma; listener local preservado; webhooks e jobs separados do limite público genérico. Handlers de upload/exclusão ausentes no controller foram restaurados. |
| Dinheiro/frete | Conversão estrita em centavos; soma de produtos + frete conferida antes do pagamento; recotação comparada ao total aceito. SuperFrete valida preço/prazo e aplica regiões permitidas, frete grátis e retirada configurados. |
| Mercado Pago | Cabeçalho `x-signature`, HMAC, request-id, data.id e janela temporal validados; consulta autenticada como fonte de verdade. Preferência inclui custo do frete e tentativa em metadata. URL de checkout HTTPS validada. |
| Idempotência | Registro prévio da tentativa, replay sem nova chamada externa, estado ambíguo bloqueado, lock por pedido, validação de linhas afetadas e deduplicação de webhooks. Múltiplos pagamentos da mesma preferência têm registros separados; estoque consumido uma vez. Falha de tentativa não cancela todas as demais. Estorno secundário não estorna o pedido principal. |
| PostgreSQL | Pool único por instância, limite inicial 3, timeouts de conexão/ociosidade, TLS verificável e integração com suspensão da Vercel. Endpoint administrativo separado e opção explícita para host pooled diferente. Expiração bloqueia pedidos e reservas na mesma ordem da confirmação. |
| Migrations | 014 preservada; 015 aditiva para tentativas de pagamento, rate limits, leases e uploads. Bootstrap `tables.sql` tinha comando psql e delimitadores de função inválidos; sintaxe corrigida e baseline testada de verdade. |
| Cloudinary | Assinatura de exclusão inclui invalidate. Upload direto assinado, formato/public_id fixados e confirmação por consulta autenticada da imagem. Idempotência e concorrência no registro; limpeza de órfãos; remoção remota antes de remover referência. |
| E-mail | Contrato `.send()` implementado com quatro templates, timeout, erros e chave de idempotência. Recuperação retorna resposta genérica inclusive em falha de entrega, com log seguro. |
| Jobs | Rotas internas com segredo independente de sessão, comparação constante, leases compartilhados, retomada após falha e lotes limitados. CLI reaproveita os mesmos serviços. |
| Segurança | Rate limiting atômico no PostgreSQL, buckets distintos, CSRF no pedido, cookies locais compatíveis e Secure em produção; URLs/CORS de produção validados, CSP e headers também no frontend. Segredos não enviados ao browser. |
| Dependências/CI | Node/npm declarados, lockfile atualizado, Vitest atualizado para eliminar avisos de vulnerabilidade conhecidos; CI Node24/PostgreSQL17 executa instalação, lint, testes, build e schema. |

## Evidência dos testes

Os logs locais `production-install.log`, `production-validation.log` e `production-postgres.log` registram execuções desta preparação e são ignorados pelo Git. O fechamento desta seção registra somente resultados efetivamente observados.

| Verificação final | Resultado |
|---|---|
| `npm ci` na raiz | Aprovado: 306 pacotes instalados; auditoria de 309 pacotes sem vulnerabilidades conhecidas |
| `npm run lint` | Aprovado nos dois workspaces, repetido após a última correção |
| `npm test` | **307 testes aprovados**, nenhuma falha: 48 frontend + 209 backend unitários + 50 integrações PostgreSQL, incluindo smoke de produção |
| `npm run build` | Aprovado, inclusive herdando NODE_ENV=test; bundle de produção 335,16 kB (99,95 kB gzip), sem aviso de tamanho |
| `npm run validate:deploy` | Aprovado contra o schema oficial arquivado |
| `node scripts/smoke-spa.mjs` | Seis deep links e assets compilados aprovados |
| `git diff --check` | Exit 0; somente avisos de conversão LF/CRLF da configuração local do Git, sem erro de whitespace |

O primeiro build da rodada completa expôs herança de `NODE_ENV=test` no CI: incluía React de desenvolvimento (599,99 kB). O comando agora fixa produção antes de importar o Vite. Build e smoke foram repetidos com o mesmo ambiente de teste para comprovar a correção; resultados finais em `production-build.log` e `production-lint.log`. Nenhum warning crítico foi ignorado. Um diagnóstico adicional com autocrlf desabilitado gerou falsos positivos sobre CRLF existentes; a verificação oficial usou a configuração normal do repositório.

- Testes de contrato: preferência com frete normal/zero, múltiplos itens, centavos, divergência de total, assinatura ausente/incorreta/expirada, payload divergente, lookup inexistente, replay e falha ambígua.
- Cloudinary: assinatura de upload/exclusão, validação autoritativa, autorização, expiração e confirmação concorrente.
- E-mail/jobs: templates, idempotência, autenticação do cron, exclusão mútua e respostas de falha.
- PostgreSQL isolado: baseline e migrations 001–015, catálogo, cursos, pedidos, administração, privacidade, ativação, checkout bloqueado, 20 incrementos concorrentes de rate limit, inicialização concorrente de pagamento e reserva/estoque.
- Smoke HTTP com `NODE_ENV=production`: readiness, login admin e cookie Secure/HttpOnly, produto/variante, cadastro de cliente, carrinho, cotação R$120, CSRF recusado quando ausente, pedido, preferência com frete R$20, webhook e repetição, pedido PAID, imagem, fila, crons e recuperação.
- Smoke SPA do build: deep links e assets em servidor local. Não equivale à execução dos rewrites no edge Vercel nem à homologação visual de todos os navegadores.

O banco descartável foi criado em instância local separada na porta 55439 com credenciais sintéticas, sem ler `.env`. Os mocks impedem chamadas reais aos provedores no smoke. O runner reinicializa apenas o schema da base `_test`. As suites de integração são sequenciais para evitar interferência de fixtures compartilhadas.

Falhas intermediárias foram investigadas, sem remover testes ou desligar validações: sintaxe do bootstrap histórico, fixture de checkout desabilitado, estímulo de rollback desatualizado e bloqueio de dependência nativa pelo Vite no Windows. O servidor de desenvolvimento do projeto foi parado para liberar a instalação. Não foi reiniciado automaticamente, pois o comando local carrega `.env` e esta tarefa não autoriza uso de credenciais reais.

## Variáveis, deploy e operação

O inventário completo por grupo está em [DEPLOY.md](../DEPLOY.md). Frontend recebe somente API relativa e origem pública; backend recebe banco runtime, URLs/CORS, Mercado Pago, SuperFrete, Cloudinary, e-mail e CRON_SECRET. Credencial administrativa existe apenas no processo deliberado de release. Preview requer banco e credenciais separados.

O procedimento cobre bootstrap, migrations, admin inicial, plano Vercel, domínio, HTTPS, verificação pós-deploy, monitoramento e rollback. [PRODUCTION_CHECKLIST.md](../PRODUCTION_CHECKLIST.md) mantém as etapas reais desmarcadas.

## Pendências e riscos restantes

1. Confirmar disponibilidade de Services beta, plano para crons por minuto, roteamento real, empacotamento Express, maxDuration e logs na conta Vercel.
2. Provisionar banco gerenciado e homologar TLS, pooler, permissões, limites de conexão, backup/restauração e migrations com credencial de release. PostgreSQL local não comprova configuração do provedor escolhido.
3. Validar credenciais, notificações/reentregas e pagamentos de teste do Mercado Pago. Operação deve tratar pagamentos tardios, estado UNKNOWN, cobrança adicional, chargeback e estorno; não há devolução automática de dinheiro nem reposição automática de estoque por estorno.
4. Homologar frete com CEPs, pesos, dimensões e serviços reais. A integração exige dados logísticos válidos; retirada configurada ainda participa do fluxo de cotação do provedor.
5. Implantar o serviço HTTP de e-mail com os quatro templates e deduplicação; verificar domínio remetente e recebimento. A outbox não garante entrega exatamente uma vez por si só.
6. Validar Cloudinary, quota da Admin API, CDN e exclusão. Upload direto evita o limite de corpo da Function, mas a conta externa continua responsável por quotas de upload.
7. Confirmar no navegador cookies, CSP, CORS, IP real, responsividade e fluxos completos no domínio final. Outras origens de imagens exigem ajuste explícito de CSP.
8. Configurar alertas de jobs, outbox esgotada, webhooks FAILED, erros 5xx e conexões. Leases retomam após dez minutos em caso de encerramento inesperado.
9. Versionar o conjunto de alterações preservando o trabalho anterior, incluindo migrations 014/015. Nenhum commit ou push foi realizado nesta tarefa.

Essas pendências impedem afirmar “pronto para produção” com base apenas nos testes locais.

## Inventário desta intervenção

Comparação com o backup de entrada, normalizando apenas CRLF/LF; não confundir com toda a diferença atual em relação ao Git. Arquivos anteriores preservados constam no registro de estado inicial.

### Criados

- `.nvmrc`
- `DEPLOY.md`
- `PRODUCTION_CHECKLIST.md`
- `backend/src/routes/jobRoutes.js`
- `backend/src/security/postgresRateLimitStore.js`
- `backend/src/services/directUploadService.js`
- `backend/src/services/jobService.js`
- `backend/src/utils/money.js`
- `backend/tests/direct-upload.test.js`
- `backend/tests/helpers/production-smoke.js`
- `backend/tests/production-contracts.test.js`
- `backend/tests/production-smoke-postgres.integration.test.js`
- `backend/tests/runtime-postgres.integration.test.js`
- `database/migrations/015_production_runtime.sql`
- `docs/PRE-DEPLOY-STATE-2026-10-06.md`
- `docs/schemas/vercel.schema.json`
- `frontend/src/components/commerce/AdminImageUpload.jsx`
- `frontend/src/services/apiBase.js`
- `frontend/src/services/apiBase.test.js`
- `frontend/scripts/build.mjs`
- `scripts/smoke-spa.mjs`
- `scripts/validate-deploy.mjs`
- `vercel.json`
- `docs/PRODUCTION-READINESS-2026-10-07.md`

### Modificados nesta intervenção

- `backend/tests/a05-a06-postgres.integration.test.js`
- `.github/workflows/ci.yml`
- `README.md`
- `backend/.env.example`
- `backend/package.json`
- `backend/src/app.js`
- `backend/src/config/database.js`
- `backend/src/config/env.js`
- `backend/src/controllers/adminController.js`
- `backend/src/controllers/orderController.js`
- `backend/src/database/adminConnection.js`
- `backend/src/middlewares/adminSecurity.js`
- `backend/src/providers/emailProvider.js`
- `backend/src/providers/paymentProvider.js`
- `backend/src/providers/shippingProvider.js`
- `backend/src/providers/storageProvider.js`
- `backend/src/repositories/adminRepository.js`
- `backend/src/repositories/emailOutboxRepository.js`
- `backend/src/repositories/orderRepository.js`
- `backend/src/repositories/paymentRepository.js`
- `backend/src/routes/adminRoutes.js`
- `backend/src/routes/customerRoutes.js`
- `backend/src/routes/index.js`
- `backend/src/routes/orderRoutes.js`
- `backend/src/scripts/expireOrders.js`
- `backend/src/scripts/sendEmails.js`
- `backend/src/scripts/setupCheck.js`
- `backend/src/security/httpSecurity.js`
- `backend/src/services/checkoutService.js`
- `backend/src/services/customerAuthService.js`
- `backend/src/services/imageService.js`
- `backend/src/services/orderService.js`
- `backend/src/services/paymentService.js`
- `backend/src/validators/checkoutValidators.js`
- `backend/tests/env.test.js`
- `backend/tests/image-service.test.js`
- `backend/tests/mercado-pago-provider.test.js`
- `backend/tests/migrations-postgres.integration.test.js`
- `backend/tests/orders-postgres.integration.test.js`
- `backend/tests/payment-service.test.js`
- `backend/tests/run-postgres-integration.js`
- `backend/tests/setup-check.test.js`
- `backend/tests/shipping-provider.test.js`
- `database/tables.sql`
- `frontend/.env.example`
- `frontend/package.json`
- `frontend/src/pages/admin/AdminPage.jsx`
- `frontend/src/pages/public/CheckoutPage.jsx`
- `frontend/src/services/api.js`
- `package-lock.json`
- `package.json`
