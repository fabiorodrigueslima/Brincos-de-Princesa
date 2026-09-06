# Produção — Brinco de Princesa

Este roteiro não contém credenciais. Use o secret manager da hospedagem e mantenha `.env` fora do Git.

## 1. PostgreSQL

Crie um banco gerenciado com TLS, um papel proprietário para migrations e um papel limitado de runtime. Configure `DATABASE_ADMIN_URL` somente no job de deploy e `DATABASE_URL` somente na API. Execute `npm run db:status`, `npm run db:migrate` e novamente `npm run db:status`. A migration mais recente deve ser `012_privacy_requests.sql`.

## 2. Backend

Use Node 22 ou superior, HTTPS atrás de proxy confiável e configure `TRUST_PROXY` conforme a hospedagem. Defina `NODE_ENV=production`, URLs públicas HTTPS, origens exatas do frontend, PostgreSQL, frete e Mercado Pago. Inicie com `npm start --workspace backend`. A inicialização falha quando uma configuração crítica habilitada está ausente.

## 3. Frontend

Defina `VITE_API_BASE_URL` com a URL pública da API e `VITE_SITE_URL` com o domínio canônico. Execute `npm run build`. Publique `frontend/dist` com fallback de SPA para `index.html`, cache longo somente para assets com hash e sem cache para HTML.

## 4. Mercado Pago

Siga `docs/MERCADO-PAGO.md`. Use credenciais de teste primeiro. O Access Token e a assinatura secreta pertencem apenas ao backend. O retorno visual nunca aprova pedidos.

## 5. Webhook

Cadastre `https://API/api/v1/webhooks/payments/mercado-pago`, habilite eventos de pagamento e valide no painel que respostas 2xx são recebidas. Configure alertas para 401, 422 e 5xx.

## 6. Frete

Em produção, use `SHIPPING_PROVIDER=superfrete` com token, CEP de origem e serviços contratados da cliente. Mantenha `configurable` somente para desenvolvimento/testes e cenários de diagnóstico. Antes de usar preço real, confirme embalagem, pesos, dimensões e uma cotação em sandbox da SuperFrete. O código ainda depende de credencial externa e homologação; não habilite o provider sem esses dados.

## 7. Storage

O backend possui upload administrativo com validação de MIME real, limite de 5 MB e nomes aleatórios. Em desenvolvimento/testes, `STORAGE_PROVIDER=local` grava em `backend/uploads` e `disabled` pode ser usado quando o fluxo de upload não participa do teste. Em produção, somente `STORAGE_PROVIDER=cloudinary` é aceito; `local`, `http` e `disabled` fazem a aplicação falhar antes de aceitar tráfego. Configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` e `CLOUDINARY_API_SECRET` somente no secret manager. O backend assina o upload, persiste a URL segura e o `public_id`, e exclui o asset remoto quando a imagem é removida. Defina ainda política de transformações, backup, retenção e invalidação de CDN no Cloudinary.

## 8. E-mail

Escolha um provider transacional com endpoint HTTP, autentique o domínio (SPF, DKIM e DMARC), configure remetente e os templates `password-reset`, `order-received`, `payment-confirmed`, `order-shipped` e `order-delivered`. Agende `npm run jobs:send-emails` a cada minuto. A outbox usa chaves únicas e tentativas controladas, evitando duplicação por replay de webhook. Nunca registre tokens em logs de produção.

## 9. Domínio, HTTPS e CORS

Configure certificados válidos, force HTTPS, mantenha `FRONTEND_ORIGINS` sem curingas e teste cookies em navegação real. Atualize DNS somente depois de `GET /api/v1/health` e `GET /api/v1/ready` responderem corretamente.

## 10. Job de reservas

Agende `npm run jobs:expire-orders` a cada 5 minutos em um scheduler externo. O comando é transacional e idempotente; não depende de `setInterval`. Alerte quando retornar código diferente de zero.

## 11. Backup

Habilite backup diário gerenciado e recuperação point-in-time quando disponível. Retenha backups diários por 30 dias e mensais pelo prazo definido com contabilidade/jurídico. Faça teste de restauração trimestral em banco isolado e registre tempo e resultado. Não execute backup improvisado dentro da API.

## 12. Observabilidade

Colete stdout JSON, métricas HTTP, latência do PostgreSQL, falhas do Mercado Pago, webhooks rejeitados, reservas expiradas e fila de e-mails. Não envie cookies, senhas, tokens ou corpos integrais a logs.

## 13. Validação e deploy

Execute `npm ci`, `npm run setup:check`, `npm audit --omit=dev`, `npm run lint`, `npm test`, `npm run build`. Rode E2E em ambiente de homologação, com banco isolado e credenciais de teste do Mercado Pago. Faça deploy gradual e uma compra Sandbox completa antes de aceitar tráfego.
