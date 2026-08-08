# Brinco de Princesa

E-commerce institucional para peças artesanais e produtos em resina.

## Estado do projeto

**Fase 4 — concluída.** O projeto possui catálogo PostgreSQL real, vitrine React, site institucional responsivo e API Node.js/Express. Consulte [`docs/PHASE-4.md`](docs/PHASE-4.md) para as evidências e limitações.

## Identidade visual

A logo oficial foi preservada em `public/brand/brinco-de-princesa-logo.png`. Na implementação, ela será usada no cabeçalho, rodapé, favicon e metadados sociais, com versões otimizadas derivadas sem substituir o arquivo original.

## Comandos

```bash
npm install
npm run dev
npm run dev:frontend
npm run dev:backend
npm run db:check --workspace backend
npm run check
```

`npm run dev` inicia os dois serviços juntos. O frontend usa `http://localhost:5173` e a API usa `http://localhost:3000` por padrão. Os comandos separados continuam disponíveis para desenvolvimento e diagnóstico.

## Próximo passo

Fase 5: evoluir a experiência da loja e do produto, incluindo galeria completa, filtros avançados, paginação por URL e SEO estruturado do catálogo.
