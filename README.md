# Brinco de Princesa

E-commerce institucional para peças artesanais e produtos em resina.

## Estado do projeto

**Fase de migrations e catálogo.** O projeto possui migrations SQL incrementais, seed de desenvolvimento idempotente, catálogo PostgreSQL real, vitrine React, produto com variantes/galeria/estoque base e API Node.js/Express. Consulte [`docs/DATABASE-MIGRATIONS.md`](docs/DATABASE-MIGRATIONS.md) e [`docs/CATALOG-PHASE.md`](docs/CATALOG-PHASE.md).

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

`db:seed:dev` cria somente dados demonstrativos e é bloqueado em produção. Nenhum comando cria carrinho, checkout, pagamento, autenticação ou painel administrativo.
