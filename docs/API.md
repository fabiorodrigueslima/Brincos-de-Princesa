# API REST

Base local: `http://localhost:3000/api/v1`.

## Saúde

- `GET /health/live` — processo da API ativo;
- `GET /health/ready` — API e PostgreSQL disponíveis.

## Catálogo público

- `GET /catalog/categories` — categorias ativas com quantidade de produtos;
- `GET /catalog/collections` — coleções ativas;
- `GET /catalog/collections/:slug` — detalhe editorial da coleção;
- `GET /products` — produtos ativos e variantes ativas;
- `GET /products/:slug` — produto, variantes, imagens e coleções.

### Parâmetros de `GET /products`

| Campo | Regra |
|---|---|
| `q` | busca, 1 a 100 caracteres |
| `category` | slug de categoria |
| `collection` | slug de coleção |
| `sort` | `newest`, `name`, `price_asc` ou `price_desc` |
| `page` | inteiro de 1 a 10.000 |
| `limit` | inteiro de 1 a 48; padrão 12 |

Campos desconhecidos e valores inválidos são rejeitados. Ordenação é selecionada por allowlist; busca, slugs, limites e offsets são enviados ao PostgreSQL como parâmetros.

Valores monetários são serializados como strings decimais, por exemplo `"109.90"`. O frontend pode formatar para exibição, mas cálculos financeiros futuros permanecerão no servidor.

## Erros

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Parâmetros inválidos.",
    "requestId": "..."
  }
}
```

Stack trace, SQL e detalhes do ambiente não são retornados.

## Administração

Rotas de criação, edição e exclusão do catálogo não foram expostas nesta fase. Elas serão publicadas somente após autenticação, autorização, CSRF e auditoria administrativas estarem implementadas no backend.
