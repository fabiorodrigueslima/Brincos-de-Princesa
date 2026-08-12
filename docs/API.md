# API REST

## Administração

`/admin/auth/login`, `/admin/auth/me` e `/admin/auth/logout` controlam sessão por cookie e CSRF. Recursos protegidos incluem dashboard, produtos, variantes, estoque, pedidos, cursos, categorias, coleções e configurações. Mutações exigem papel permitido e schemas estritos. Upload, gateway e frete permanecem indisponíveis sem providers reais.

## Pedidos e pagamentos

- `POST /orders` exige `Idempotency-Key`, recota tudo e cria pedido e reserva em transação somente com frete real;
- `GET /orders/:code` exige `X-Order-Token` e não aceita ID sequencial;
- `POST /orders/:code/payments` exige token e idempotência, mas permanece indisponível sem gateway;
- `POST /webhooks/payments/:provider` aceita somente provider configurado e evento autenticado pelo adapter.

Nenhum endpoint aceita preço, frete, total, PAN ou CVV como autoridade.

## Checkout público

- `GET /checkout/postal-code/:postalCode` consulta CEP normalizado por adapter com timeout;
- `POST /checkout/quote` revalida itens, preço, promoção e estoque e calcula valores no servidor.

A cotação aceita itens, identificação, endereço e identificador da opção logística. Preço, subtotal, frete e total enviados pelo navegador são rejeitados. Sem transportadora configurada, retorna `SHIPPING_NOT_CONFIGURED`.

Na Fase 5, `GET /products/:slug` permanece a fonte autoritativa do detalhe público e entrega categoria, coleções, imagens, variantes ativas, preços, promoção, estoque, atributos flexíveis e informações opcionais cadastradas. O frontend não inventa valores ausentes.

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

## Cursos públicos

- `GET /courses?page=1&limit=12` — cursos publicados, com paginação;
- `GET /courses/:slug` — detalhe publicado e sessões futuras públicas.

A listagem aceita somente `page` e `limit` (máximo 24). Campos desconhecidos são rejeitados. Rascunhos, arquivados, publicações futuras e sessões privadas, passadas ou canceladas não são expostos. Slug inexistente retorna `COURSE_NOT_FOUND` com HTTP 404.

### Parâmetros de `GET /products`

| Campo | Regra |
|---|---|
| `q` | busca, 1 a 100 caracteres |
| `category` | slug de categoria |
| `collection` | slug de coleção |
| `promotions` | `true` ou `false`; `true` exige promoção válida no servidor |
| `sort` | `newest`, `name`, `price_asc` ou `price_desc` |
| `page` | inteiro de 1 a 10.000 |
| `limit` | inteiro de 1 a 48; padrão 12 |

Campos desconhecidos e valores inválidos são rejeitados. Ordenação é selecionada por allowlist; busca, slugs, limites e offsets são enviados ao PostgreSQL como parâmetros.

`newest` ordena por `publicado_em DESC` e depois pelo ID, sem criar janela arbitrária de novidade. Ordenações por preço usam o menor preço efetivo da variante (`preco_promocional` válida ou `preco`).

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
