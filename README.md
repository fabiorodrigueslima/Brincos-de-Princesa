# Brinco de Princesa

> Fase 8: painel administrativo protegido disponível em `/admin`. Crie o primeiro proprietário com `npm run admin:create`. Consulte [`docs/PHASE-8-ADMIN.md`](docs/PHASE-8-ADMIN.md).

> Fase 7 preparada com pedido transacional, reserva concorrente, idempotência, fronteira de pagamento e webhook. Operações públicas permanecem bloqueadas até frete e gateway reais. Consulte [`docs/PHASE-7-ORDERS-PAYMENTS.md`](docs/PHASE-7-ORDERS-PAYMENTS.md).

> Fase 6 implementada até a revisão: consulte [`docs/PHASE-6-CHECKOUT-SHIPPING.md`](docs/PHASE-6-CHECKOUT-SHIPPING.md). Frete real permanece desabilitado até a configuração de transportadora e dados logísticos confiáveis.

> Fase 5 concluída: consulte [`docs/PHASE-5-PRODUCT.md`](docs/PHASE-5-PRODUCT.md) para a evolução da página individual de produto.

E-commerce de biojoias artesanais em cerâmica e acessórios autorais.

## Estado do projeto

**Fase 4 de cursos concluída.** O projeto possui área pública de cursos, categorias comerciais, novidades, promoções reais, coleções dinâmicas, migrations SQL incrementais, catálogo PostgreSQL, produto com variantes e carrinho anônimo validado pelo servidor. Consulte [`docs/PHASE-4-COURSES.md`](docs/PHASE-4-COURSES.md), [`docs/PHASE-3-CATALOG.md`](docs/PHASE-3-CATALOG.md) e [`docs/DATABASE-MIGRATIONS.md`](docs/DATABASE-MIGRATIONS.md).

## Identidade visual

A logo oficial foi preservada em `frontend/public/brand/brinco-de-princesa-logo.png` e é usada no cabeçalho, rodapé, favicon e estados visuais do catálogo.

## Comandos

```bash
npm install
npm run dev
npm run dev:frontend
npm run dev:backend
npm run db:check
npm run db:migrate
npm run db:seed:dev
npm test
npm run check
```

`npm run dev` inicia os dois serviços juntos. O frontend usa `http://localhost:5173` e a API usa `http://localhost:3000` por padrão. Os comandos separados continuam disponíveis para desenvolvimento e diagnóstico.

`db:seed:dev` cria somente dados demonstrativos e é bloqueado em produção. O carrinho é local e anônimo; nenhum comando cria checkout, pagamento, autenticação ou painel administrativo.
