# Fase 3 — Catálogo comercial

## Taxonomia

Categoria responde “o que é a peça”: `brincos`, `aneis`, `colares` e `pulseiras`. Material continua no campo textual `produtos.materiais`. Coleção continua sendo uma relação muitos-para-muitos por `produto_colecoes`.

Resina e Florais foram preservados no banco como categorias históricas inativas. Nenhum produto estava ligado a elas no momento da migration. O produto demonstrativo em resina já pertencia a Brincos e mantém essa composição no campo de materiais.

## Rotas públicas

- `/loja`: todos os produtos, busca, categoria, ordenação e paginação;
- `/brincos`, `/aneis`, `/colares`, `/pulseiras`: mesmo catálogo com categoria fixa;
- `/novidades`: produtos ativos por publicação mais recente;
- `/promocoes`: somente produtos com variante ativa e promoção válida;
- `/colecoes` e `/colecoes/:slug`: coleções reais e seus produtos.

## API e preço

`GET /api/v1/products` aceita `q`, `category`, `collection`, `promotions`, `sort`, `page` e `limit`. Promoção válida exige valor não nulo, maior que zero e menor que o preço normal. A ordenação por preço usa o menor preço efetivo exibido. Valores externos permanecem parametrizados e a ordenação é resolvida por allowlist.

## Seed

O seed de desenvolvimento cria quatro produtos explicitamente demonstrativos, seis variantes, uma promoção válida, um item sem estoque e uma coleção técnica. O arquivo é idempotente, bloqueado em produção e não representa oferta comercial.

## Reversão manual

A migration não apaga dados. Uma reversão lógica pode inativar `aneis`, `colares` e `pulseiras` caso estejam vazias e reativar os registros históricos, mas só deve ser feita após verificar vínculos criados depois da aplicação. A migration aplicada não deve ser editada.
