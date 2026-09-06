# Correção dos bloqueadores internos — Brinco de Princesa

**Data:** 05/09/2026

## Estado inicial

O diagnóstico identificou três bloqueadores internos:

1. O Mercado Pago retornava para `/pedido/:code`, mas o frontend não registrava essa rota.
2. `AdminPage.jsx` existia, mas não estava montado no roteamento principal.
3. Quando o Cloudinary aceitava o upload e a persistência no banco falhava, o rollback usava a chave temporária em vez do `public_id`, com risco de asset órfão.

## Rota `/pedido/:code`

A rota foi adicionada ao `App.jsx` usando o `OrderPage.jsx` existente. Não foi criada página duplicada.

O fluxo continua protegido por token:

`/pedido/:code -> sessionStorage -> getOrder(code, token) -> API -> estado real do pedido`

A página não lê nem aplica `status=approved`, `status=pending` ou qualquer outro parâmetro de pagamento. O backend continua sendo a autoridade.

A página existente trata:

- token ausente;
- pedido inexistente/erro da API;
- pedido aguardando pagamento;
- pagamento confirmado;
- cancelamento;
- estorno;
- chargeback;
- demais estados retornados pelo backend.

A rota funciona em acesso direto e refresh porque o token é recuperado do `sessionStorage` e a sessão do pedido não depende de navegação anterior dentro do React.

## Admin

A rota `/admin` foi montada fora do layout público usando o `AdminPage.jsx` existente.

A proteção continua baseada na arquitetura já existente:

- `adminMe()` consulta a sessão via cookie HttpOnly;
- o backend usa `requireAdmin`;
- mutações usam CSRF;
- endpoints aplicam `requireRole`;
- o frontend bloqueia sessão sem papel reconhecido (`OWNER`, `MANAGER` ou `FULFILLMENT`);
- usuário não autenticado permanece na tela de login administrativo;
- refresh em `/admin` repete a consulta de sessão e não depende de outra rota.

Não foi criada uma segunda implementação de autenticação.

## Cloudinary rollback

`imageService.upload` agora usa `stored.providerAssetId` quando disponível para compensar a falha de persistência no banco.

Fluxo:

1. Cloudinary recebe o upload.
2. O provider retorna URL e `public_id`.
3. O repository tenta persistir URL e `storage_key`.
4. Se o banco falhar, o service chama `storageProvider.delete(public_id)`.
5. Se o cleanup também falhar, o erro original do banco continua sendo lançado.
6. A falha de compensação é registrada sem secrets, incluindo evento, identificador do asset e código do erro.

A exclusão normal continua usando `storage_key` persistido para remover o asset correto.

## Arquivos modificados

- `frontend/src/App.jsx`
- `frontend/src/pages/admin/AdminPage.jsx`
- `backend/src/services/imageService.js`
- `backend/tests/image-service.test.js`
- `frontend/src/routes-contract.test.js`
- `frontend/src/pages/public/orderModel.test.js`
- `docs/INTERNAL-BLOCKERS-FIX-2026-09-05.md`

As alterações anteriores do repositório foram preservadas.

## Testes adicionados

### Rota e admin

- `/pedido/:code` e `/admin` estão montadas no `App.jsx`.
- `OrderPage` consulta o backend e não usa status da query string.
- `AdminPage` usa a sessão existente e limita papéis reconhecidos.
- estados reais do pedido continuam cobertos pelo modelo de status.

### Cloudinary

- upload com `providerAssetId` usa o identificador remoto no cleanup;
- falha do banco chama exclusão remota correta;
- falha do cleanup não substitui o erro original;
- falha é registrada com segurança;
- exclusão normal continua usando `storage_key`.

## Regressão

Executado:

- `npm run lint`
- `npm test`
- `npm run build`
- `npm run db:status --workspace backend`
- `git diff --check`

Resultados:

- Frontend: **34 testes passaram**
- Backend unitário: **120 testes passaram**
- PostgreSQL/integrados: **29 testes passaram**
- Total: **183 testes passaram**
- Falhas: **0**
- Skipped: **0**

O banco local respondeu conectado, com schema válido e categorias ativas.

Não foram executados pagamentos reais, webhooks reais, cotação real SuperFrete ou upload real Cloudinary, conforme solicitado.

## Problemas restantes

- Não há E2E real de navegador desktop/mobile para provar refresh, retorno do gateway e interação visual.
- A UI administrativa continua funcionalmente limitada em edição completa, clientes e gerenciamento visual de imagens.
- Não há polling automático ativo da página de pedido para mudança de status após o retorno do gateway.
- E-mail transacional, deploy, domínio, HTTPS, backup, scheduler e observabilidade ainda não estão provisionados.
- Mercado Pago, SuperFrete e Cloudinary dependem de homologação externa.

## Dependências externas

- Credenciais e conta Mercado Pago.
- Credenciais e webhook acessível do Mercado Pago.
- Conta/token, CEP de origem, serviços, peso e dimensões reais da SuperFrete.
- Conta e credenciais Cloudinary.
- PostgreSQL hospedado com backup/PITR.
- Domínio, DNS e HTTPS.
- Provedor de e-mail.
- Secret manager, scheduler e monitoramento.

## Classificação final

### Rota de pedido

✅ **CORRIGIDA**

A rota está montada, consulta o backend e ignora parâmetros falsos de status.

### Admin

✅ **CORRIGIDO**

A rota está montada, usa a sessão existente, preserva RBAC/CSRF no backend e bloqueia papéis não reconhecidos no frontend.

### Cloudinary rollback

✅ **CORRIGIDO**

A compensação usa `public_id`, preserva o erro original e registra falha de cleanup sem expor secrets.

## Status do código

🟢 **PRONTO PARA PRODUÇÃO**

Os três bloqueadores internos identificados foram corrigidos e cobertos por testes. Isso não substitui homologação das integrações externas.

## Status do go-live

🟡 **GO-LIVE DEPENDE DE CONFIGURAÇÕES/VALIDAÇÕES EXTERNAS**

O código não deve ser considerado operacionalmente validado até concluir testes reais de Mercado Pago, SuperFrete e Cloudinary, além de configurar infraestrutura, domínio, HTTPS, banco hospedado, e-mail, backup e monitoramento.
