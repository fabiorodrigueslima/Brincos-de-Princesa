# Fase 4 — Catálogo real

Status: concluída em 8 de agosto de 2026.

## Backend

- Repository PostgreSQL de categorias e coleções.
- Repository de produtos com busca, categoria, coleção, ordenação e paginação.
- Detalhe de produto com variantes, estoque disponível, imagens e coleções.
- Services com DTOs explícitos; objetos completos do banco não são retornados.
- Validação Zod de query e params, com rejeição de campos inesperados.
- Erros 400, 404 e 503 controlados.
- Preços serializados como strings decimais.
- API pública documentada em `docs/API.md`.

## Frontend

- Loja conectada à API real.
- Busca, filtro por categoria, ordenação e paginação.
- Cards com preço, promoção, disponibilidade e imagem.
- Estado de carregamento, catálogo vazio e serviço indisponível.
- Página `/produto/:slug` com informações, variações, estoque, materiais, medidas, produção e cuidados.
- Nenhum produto ou preço fictício no ambiente normal.

## Segurança

- Busca e slugs nunca entram diretamente no texto SQL.
- Ordenação usa somente quatro fragmentos definidos no código.
- Paginação tem limite máximo de 48 registros.
- Somente produtos e variantes ativos são públicos.
- Estoque exposto é o saldo disponível (`estoque - estoque_reservado`).
- A API não aceita preço enviado pelo navegador.
- Rotas administrativas de escrita não foram abertas sem autenticação.
- Falta de banco retorna 503 sem revelar conexão ou SQL.

## Defeitos encontrados pelos testes reais

O teste em PostgreSQL identificou e permitiu corrigir dois problemas que os testes isolados não detectaram:

1. `DB_SSL=false` era interpretado como texto não vazio e ativava SSL;
2. o wrapper `query` não aceitava o formato `{ text, values }` usado pelos repositories.

Ambos foram corrigidos antes da conclusão da fase. Foi adicionado teste de regressão para o valor booleano do SSL.

## Verificações

- lint frontend e backend: aprovado;
- suíte normal: 15 testes aprovados;
- integração PostgreSQL: 2 testes aprovados;
- build Vite: aprovado, 42 módulos transformados;
- PostgreSQL temporário encerrado e removido após os testes.

Os dois testes PostgreSQL aparecem como `skipped` na suíte normal porque exigem `DATABASE_URL`. Eles foram executados separadamente contra PostgreSQL 18.4 real e passaram.

## Limitações

- O banco principal ainda precisa ser inicializado com credencial administrativa local.
- O catálogo normal ficará vazio até produtos reais serem cadastrados.
- Administração de escrita aguarda autenticação segura; não existe endpoint administrativo desprotegido.
- Carrinho e checkout ainda não estão ativos.
- Imagens do catálogo deverão usar URLs de armazenamento definitivo no ambiente de produção.

## Próxima fase

Fase 5: refinar loja e produto com galeria, filtros avançados, URL de filtros, SEO de produto e navegação entre coleções. Depois, a Fase 6 implementará o carrinho com recálculo autoritativo no backend.
