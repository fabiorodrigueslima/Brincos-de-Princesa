# Deploy — Brinco de Princesa

Estado: preparado para homologação. Nenhum deploy, push, pagamento real ou alteração de banco de produção foi executado nesta preparação. Use o checklist antes da abertura comercial.

Migração concluída em 07/10/2026: Neon em São Paulo, PostgreSQL 18.6, banco `neondb`, migrations 001–015 e runtime pooled restrito validados. A URL real está somente em `C:\backup-brinco\20261007_010534\neon-runtime.env`; a credencial de release fica separada. Backup online restaurado e testes simulados aprovados em banco de ensaio distinto. Primeiro administrador criado e senha verificada; plano Launch e janela de recuperação de sete dias confirmados pelo responsável. Backup contínuo externo ainda pendente. Consulte o [relatório](docs/DATABASE-MIGRATION-REPORT-2026-10-07.md) e o [procedimento](docs/DATABASE-MIGRATION-NEON.md). Não houve deploy.

## Primeira publicação: catálogo e painel

O responsável escolheu publicar o site atualizado sem compras. Configure `SITE_MODE=catalog` no backend (Production). O modo mantém HTTPS, cookies seguros, autenticação administrativa e rate limit PostgreSQL; bloqueia carrinho, checkout, pedidos públicos, contas de clientes, webhooks e jobs antes de qualquer operação de negócio. Os provedores de pagamento, frete, e-mail e armazenamento ficam desativados. O frontend consulta `/api/v1/storefront` e oculta compras e login de cliente. Sem resposta válida, as compras continuam bloqueadas. O painel permanece em `/admin`; upload de novas imagens requer configurar o armazenamento numa etapa posterior.

Variáveis desta fase: `SITE_MODE=catalog`, `DATABASE_URL` pooled restrita, `DB_SSL=true`, `DB_POOL_MAX=3`, `VITE_API_BASE_URL=/api/v1`, `PUBLIC_FRONTEND_URL`, `PUBLIC_BACKEND_URL` e `FRONTEND_ORIGINS` com o domínio HTTPS canônico. Não cadastrar credencial administrativa no runtime.

O `vercel.json` desta publicação não agenda crons. As seções de integrações abaixo são requisitos futuros para `SITE_MODE=commerce`, que permanece o padrão se o modo não for informado. Antes de ativá-lo, homologar integrações e reintroduzir os agendamentos de e-mail (`* * * * *`) e expiração (`*/5 * * * *`) em infraestrutura compatível. Não habilitar compras apenas trocando a variável.

A configuração do projeto Vercel deve apontar à raiz do repositório, permitindo os dois serviços, não apenas à pasta frontend. A disponibilidade e o resultado do deployment devem ser conferidos no painel. Esta preparação local não confirma publicação online.

## Arquitetura e requisitos

Um projeto Vercel Services na raiz do monorepo: serviço `frontend` (React/Vite, pasta `frontend`, saída `dist`) e serviço `backend` (Express, pasta `backend`, entrada `src/app.js`). O rewrite `/api/:path*` seleciona o backend preservando o caminho; o restante vai ao frontend, cujo fallback entrega `index.html`. Não configure o projeto inteiro com Root Directory `frontend`.

Node **24.x**, npm **11.x**, PostgreSQL gerenciado com TLS, papéis separados e endpoint com pooling compatível com `pg`. O pool é único por instância, máximo padrão 3 conexões, integrado ao ciclo de suspensão da Vercel com `attachDatabasePool`. Fluid Compute e duração de função de 300 segundos estão previstos. Serviços é uma funcionalidade beta: confirme disponibilidade na conta antes do primeiro deploy.

Para a futura operação comercial, os crons serão a cada minuto para e-mails e a cada cinco minutos para expiração de reservas. A frequência exige **plano Pro ou superior**; Hobby não atende a esse agendamento. Não reduza a frequência sem rever prazos de reservas e de entrega da fila. Crons da Vercel executam no deployment de produção; em preview, acione-os manualmente com segredo separado.

## Configuração de ambiente

Cadastre no painel Vercel os valores correspondentes ao ambiente. Segredos somente no backend; nunca use prefixo `VITE_` para credenciais. Os arquivos `.env.example` são modelos de desenvolvimento, não devem ser copiados sem adaptação para produção. Não use `CHANGEME` como credencial.

| Grupo | Variáveis | Configuração |
|---|---|---|
| Frontend | `VITE_API_BASE_URL` | `/api/v1`; também é o padrão quando ausente. |
| Frontend | `VITE_SITE_URL` | Origem HTTPS pública, sem caminho; opcional, usada nos metadados. |
| Backend | `NODE_ENV` | `production`. |
| Backend | `PUBLIC_FRONTEND_URL`, `PUBLIC_BACKEND_URL` | Mesma origem HTTPS final, sem `/api` no final. |
| Segurança | `FRONTEND_ORIGINS` | Lista explícita de origens HTTPS separadas por vírgula, sem barra final. Sem curingas. |
| Segurança | `TRUST_PROXY` | `1` na Vercel; validar o IP real e o comportamento do proxy em homologação. Local sem proxy: `0`. |
| Banco | `DATABASE_URL` | URL pooled do usuário restrito `brinco_app`; nunca o administrador. |
| Banco | `DB_SSL` | `true` no banco remoto, com certificado confiável; não desligar validação do certificado. |
| Banco | `DB_POOL_MAX` | `3` inicialmente; dimensionar conexões totais × instâncias com o limite do provedor. |
| Banco | `DB_IDLE_TIMEOUT_MS`, `DB_CONNECTION_TIMEOUT_MS` | `10000`, `3000` por padrão. |
| Mercado Pago | `PAYMENT_PROVIDER` | `mercado-pago`. |
| Mercado Pago | `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET` | Segredos da aplicação e do webhook do ambiente correspondente. |
| Mercado Pago | `MERCADO_PAGO_API_URL` | `https://api.mercadopago.com`. |
| Mercado Pago | `WEBHOOK_MAX_AGE_SECONDS` | `600`; janela da assinatura, não a idade do pagamento. Verificar política de reentrega no ambiente real. |
| Cloudinary | `STORAGE_PROVIDER` | `cloudinary`. |
| Cloudinary | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Conta do ambiente. API secret fica exclusivamente no servidor. |
| Cloudinary | `CLOUDINARY_FOLDER` | `brinco-de-princesa/products`; use pasta/conta distinta em preview. |
| Frete | `SHIPPING_PROVIDER` | `superfrete`. |
| Frete | `SUPERFRETE_API_BASE_URL` | Endpoint HTTPS de produção confirmado no painel/documentação do provedor, sem `sandbox`. |
| Frete | `SUPERFRETE_TOKEN`, `SUPERFRETE_ORIGIN_CEP`, `SUPERFRETE_SERVICES` | Token, CEP de origem com oito dígitos, serviços habilitados (`1,2` por padrão). |
| Frete | `SHIPPING_FREE_ABOVE`, `SHIPPING_ALLOWED_STATES` | Opcionais; limiar decimal e UFs permitidas. |
| Frete | `SHIPPING_LOCAL_PICKUP`, `SHIPPING_LOCAL_PICKUP_LABEL` | `false` inicialmente; habilitar somente com retirada operacional definida. |
| Frete local | `SHIPPING_FIXED_PRICE`, `SHIPPING_ESTIMATED_DAYS` | Apenas o provedor configurável de desenvolvimento. Não substitui SuperFrete em produção. |
| CEP | `POSTAL_CODE_PROVIDER_URL` | Padrão `https://brasilapi.com.br/api/cep/v2`. |
| Integrações | `EXTERNAL_REQUEST_TIMEOUT_MS` | `4000` padrão, máximo `15000`. |
| E-mail | `EMAIL_PROVIDER` | `http`. É necessário um serviço que implemente o contrato abaixo. |
| E-mail | `EMAIL_WEBHOOK_URL`, `EMAIL_WEBHOOK_TOKEN` | Endpoint HTTPS e token de autenticação. |
| Sessões | `CUSTOMER_SESSION_HOURS`, `ADMIN_SESSION_HOURS` | `168` e `8` por padrão. Cookies HttpOnly/Secure/SameSite em produção, sem Domain. |
| Rate limit | `RATE_LIMIT_STORE` | `postgres`, ou omitido em produção. `memory` é recusado em produção. |
| Cron | `CRON_SECRET` | Segredo aleatório exclusivo com pelo menos 32 caracteres; a Vercel envia `Authorization: Bearer …`. |
| Plataforma | `VERCEL`, `VERCEL_ENV` | Fornecidas pela Vercel; não simular esses valores manualmente em produção. |

Somente no processo deliberado de release: `DATABASE_ADMIN_URL`, `ALLOW_REMOTE_MIGRATION_DATABASE=true` e, quando endpoints pooled/direto diferirem, `ALLOW_DIFFERENT_DATABASE_ENDPOINTS=true`. O último libera a diferença de hostname/porta; o operador deve confirmar que ambos apontam para o mesmo banco. Usuários e senhas precisam ser distintos. Essas variáveis administrativas não são necessárias nas Functions.

Somente em testes: `TEST_DATABASE_URL`, `TEST_DATABASE_ADMIN_URL`, e excepcionalmente `ALLOW_REMOTE_TEST_DATABASE=true` para infraestrutura descartável. O runner não lê `.env`, exige nome `_test` e reinicializa seu schema; nunca aponte para dados úteis. `PORT` é local. `STORAGE_HTTP_URL`, `STORAGE_HTTP_TOKEN` e `STORAGE_PUBLIC_URL` pertencem às alternativas de desenvolvimento.

## Banco, baseline e migrations

Antes de qualquer release, tire backup e teste restauração. O runtime não executa DDL. A migration `001` valida uma baseline existente; não cria um banco vazio sozinha.

Para um banco novo, provisionar os papéis `brinco_owner` (NOLOGIN) e `brinco_app` (LOGIN restrito), schema `app` e uma credencial administrativa autorizada a `SET ROLE brinco_owner`. O bootstrap histórico é `database/database.sql`, seguido de `tables.sql`, `indexes.sql`, `seed.sql` e permissões. Esses arquivos têm comandos psql e o nome `brinco_de_princesa`; um DBA deve adaptar o bootstrap ao banco gerenciado se ele não permitir `CREATE DATABASE`, criação de papéis ou esse nome. Não execute os scripts históricos em uma base existente para "atualizá-la".

Configure no papel/banco `search_path=app,public`, `statement_timeout=10s` e `lock_timeout=3s`, conforme `database.sql`. O runtime qualifica os objetos com `app`; não envia opções de sessão incompatíveis com alguns poolers. Certifique-se de que as configurações do papel são respeitadas pelo endpoint pooled. A URL administrativa deve usar conexão direta e TLS conforme o provedor (por exemplo parâmetros de certificado suportados por `pg`); `DB_SSL` controla o pool runtime, não adiciona TLS à URL administrativa.

Com credenciais de release injetadas por um gerenciador seguro:

```text
npm run db:status
npm run db:migrate
npm run db:status
npm run admin:create
```

O runner usa lock e checksum, aplica cada migration em transação e não roda em cold start/build. Para banco existente, aplique apenas migrations pendentes. A **014_customer_activation.sql** já era trabalho local e foi preservada; deve integrar o release e depende das anteriores. A **015_production_runtime.sql** adiciona estados de inicialização de pagamento, URL de checkout, rate limits, leases dos jobs e intenções de upload. Ambas devem ser versionadas junto com o código. Não altere migrations já aplicadas. O script de administrador é interativo; execute em terminal privado. Não use seed demonstrativo em produção.

## Mercado Pago e frete

Configure webhook HTTPS em `/api/v1/webhooks/payments/mercado-pago`, com notificações de pagamento e o mesmo segredo do backend. A API valida `x-signature`, `x-request-id`, `data.id` e timestamp e consulta o pagamento autenticadamente. O corpo recebido não decide valor ou status do pedido. Retorno do navegador também não confirma pagamento.

Produtos e frete usam centavos inteiros nas contas e `numeric(12,2)` no banco. A preferência envia produtos e `shipments.cost`; R$100 + R$20 resulta em R$120. O backend recota e compara o total apresentado antes de criar o pedido. Cadastre pesos/dimensões logísticos reais antes de homologar SuperFrete; não há substituição silenciosa por cotação fictícia em produção.

Cada tentativa de preferência é persistida antes da chamada externa. Timeout ou resposta ambígua deixa estado `UNKNOWN` e bloqueia nova inicialização automática. Antes de liberar a tentativa, o operador deve conciliar no Mercado Pago: não simplesmente apagar a linha ou criar outra preferência. Webhooks de múltiplos IDs da mesma preferência são registrados separadamente e só uma aprovação consome o estoque. Falha de uma tentativa não cancela as outras; a reserva expira pelo job. Pagamento tardio ou cobrança adicional fica sinalizado para revisão em `webhook_eventos`; estorno/devolução não é executado automaticamente. Estorno de um recebimento secundário não altera um pedido pago por outro recebimento.

## Imagens

Admin autenticado solicita `/api/v1/admin/images/sign`, envia o arquivo diretamente ao Cloudinary e confirma em `/api/v1/admin/images/complete`. Há CSRF e autorização; a confirmação consulta a Admin API do Cloudinary e valida public_id, formato, MIME e tamanho, em vez de confiar na URL do browser. Limite 5 MiB para JPEG/PNG/WebP. A assinatura fixa o public_id e impede sobrescrita. O fluxo antigo pelo backend fica limitado a 4 MiB para respeitar o limite de payload da Vercel.

O cron de expiração remove uploads abandonados em lotes. Exclusão remota inclui `invalidate` na assinatura e precede a remoção da referência no banco. Homologue quota da Admin API, entrega da CDN e exclusão/invalidação. O frontend permite a CDN Cloudinary na CSP; outras origens de imagens precisarão de revisão explícita.

## E-mail e jobs

O adaptador HTTP envia `POST` com `Authorization: Bearer`, JSON `{template,to,variables}`. Templates exigidos: `password-reset` (`resetUrl`), `account-activation` (`activationUrl`), `order-received` e `payment-confirmed` (código do pedido nas variáveis persistidas). O serviço receptor deve renderizar e entregar essas mensagens e retornar HTTP 2xx somente após aceitar o envio.

A outbox é persistente e o job usa `Idempotency-Key` derivado de `event_key`. O receptor deve deduplicar essa chave: a entrega é pelo menos uma vez, e interrupção após envio pode provocar repetição. Lotes de 10, até cinco tentativas, retomada de itens PROCESSING após dez minutos. Monitore FAILED com cinco tentativas, idade dos pendentes e falhas do cron; reprocessamento exige investigação da causa e ação administrativa deliberada.

Endpoints GET `/api/internal/jobs/send-emails` e `/api/internal/jobs/expire-orders` exigem CRON_SECRET. Leases no PostgreSQL impedem sobreposição; expiram em dez minutos após encerramento inesperado. Falhas parciais de e-mail retornam 503; execução concorrente ignorada retorna 200 com `skipped`. Os comandos CLI continuam disponíveis e usam a mesma lógica. Não há processo permanente ou temporizador necessário.

## Preview, primeiro deploy e domínio

1. Prepare banco, contas externas e segredos **separados** para homologação. Preview também roda com `NODE_ENV=production`; `VERCEL_ENV=preview` permite endpoint sandbox do frete. Use credenciais de teste do Mercado Pago, caixa de e-mail de teste e Cloudinary separado.
2. Execute as verificações locais abaixo e registre o commit de release contendo código, lockfile e migrations. Nenhum commit/push foi feito automaticamente nesta tarefa.
3. No Vercel, importe a raiz, habilite Services/Fluid Compute e Node 24; preserve os serviços definidos no `vercel.json`. Instalação a partir do workspace raiz com `npm ci`. Verifique que o build do frontend vê apenas variáveis públicas.
4. Configure origens exatas de preview e callbacks; prefira domínio estável de homologação. Não permita qualquer `*.vercel.app` no CORS.
5. Aplique migrations deliberadamente antes de disponibilizar o código que depende delas. Confirme `db:status` sem pendências e crie o OWNER inicial.
6. Após publicação autorizada, confira `/api/v1/health` e `/api/v1/ready`, deep links da SPA, assets, headers, cookies, login, pedido, frete, webhook e jobs. Confirme a preservação de `/api` nos rewrites e o IP usado nos limites. O schema local não substitui esse teste de roteamento na plataforma.
7. Configure domínio/HTTPS, webhook definitivo e cron de produção. Só habilite o checkout comercial no painel após concluir o checklist; migrations não devem abrir vendas automaticamente.

## Validação local reproduzível

Node 24 e npm 11, a partir da raiz:

```text
npm ci
npm run lint
npm test
npm run build
npm run validate:deploy
node scripts/smoke-spa.mjs
git diff --check
```

`npm test` inclui PostgreSQL: exige as duas URLs explícitas de um banco descartável com papéis pré-criados. CI cria PostgreSQL 17 isolado. Testes unitários separados: `npm run test:unit --workspace backend`. Integração separada: `npm run test:postgres --workspace backend`. O smoke HTTP usa configuração de produção, banco `_test` local e substituições controladas dos provedores; não faz pagamentos/envios reais. O smoke SPA verifica o fallback do build local; não reproduz o edge Vercel.

## Operação e rollback

Observe logs sem tokens, 5xx, latência, utilização de conexões, falhas de webhook, reservas expiradas, filas de e-mail e quotas externas. Guarde backup e evidência de restauração. Não use `/health` sozinho como prova de conectividade; `/ready` consulta o banco.

Para incidente: pause novas vendas no painel, preserve evidências e concilie pagamentos em andamento. Reverta o deployment para versão compatível apenas após confirmar contratos do banco. A migration 015 é aditiva; não remova suas tabelas/colunas para reverter o aplicativo. Migrations não têm down automático: use correção aditiva revisada. Nunca restaure backup por cima de pagamentos posteriores sem plano de reconciliação. Gire credenciais comprometidas e valide os webhooks antes de reabrir.

## Referências verificadas

- [Vercel Services](https://vercel.com/docs/services), [configuração](https://vercel.com/docs/services/config-reference) e [roteamento](https://vercel.com/docs/services/routing).
- [Cron Jobs](https://vercel.com/docs/cron-jobs) e [limitações](https://vercel.com/docs/cron-jobs/usage-and-pricing).
- [Limites de Functions](https://vercel.com/docs/functions/limitations).
- [Webhooks Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks).
- [Upload Cloudinary](https://cloudinary.com/documentation/image_upload_api_reference).

Schema oficial arquivado em `docs/schemas/vercel.schema.json`, obtido de `https://openapi.vercel.sh/vercel.json`. O validador normaliza as declarações mistas draft-04/draft-06 de limites numéricos sem retirar regras de validação.

## Validação do modo catálogo — 07/10/2026

Lint aprovado, 217 testes unitários backend e 53 testes frontend aprovados, build e validação do schema Vercel aprovados. Ensaio com NODE_ENV=production e SITE_MODE=catalog no Neon confirmou readiness, login OWNER, dashboard e logout; tentativa direta de criar pedido foi bloqueada com 503 antes de qualquer criação. Não houve push ou deploy nesta etapa.
