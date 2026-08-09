# Fase do carrinho

## Arquitetura

O carrinho é local e anônimo. O React mantém somente identificadores de variantes e quantidades; a API consulta novamente o PostgreSQL e reconstrói nome, variante, SKU, imagem, preço, estoque e subtotais antes da exibição.

Fluxo: `CartContext` → `localStorage` → `POST /api/v1/cart/validate` → PostgreSQL → resposta validada.

Não foi criada tabela nem migration. A aplicação continua precisando somente de `SELECT` no catálogo.

## Persistência local

Chave: `brinco-de-princesa:cart`.

```json
[{ "variantId": 10, "quantity": 2 }]
```

Entradas corrompidas, IDs inválidos, quantidades fora de 1–99 e formatos inesperados são descartados sem interromper a interface. Preço, subtotal, total e estoque locais nunca são fonte comercial confiável.

## API de validação

`POST /api/v1/cart/validate`

Entrada: `{ "items": [{ "variantId": 10, "quantity": 2 }] }`.

A saída inclui dados atuais do produto e da variante, `unitPrice`, `availableStock`, `subtotal`, `available` e um motivo controlado quando indisponível. Variantes inexistentes também retornam como item indisponível, sem erro 500.

## Dinheiro, estoque e segurança

O preço efetivo (`preco_promocional` ou `preco`) vem sempre do PostgreSQL. O backend converte `NUMERIC(12,2)` em centavos inteiros para multiplicar e somar, evitando `FLOAT`. Campos extras como um `price` adulterado são ignorados. IDs são validados e a consulta usa parâmetros.

Adicionar ao carrinho não executa `UPDATE`, não cria pedido e não altera disponibilidade global.

**CARRINHO NÃO RESERVA ESTOQUE.** A disponibilidade ainda deverá ser revalidada no futuro fluxo transacional de pedido.

## Testes

Há testes do reducer e da recuperação do armazenamento local, validação de entrada da API, cálculo server-side, fraude de preço, itens inexistentes/inativos, estoque zero/insuficiente e múltiplos produtos. A suíte PostgreSQL existente continua isolada no banco de testes e o `verify.sql` continua transacional com `ROLLBACK`.

## Limitações desta fase

Não há checkout, pagamento, pedido, reserva de estoque, autenticação, cupons ou painel administrativo. Frete é apenas indicado como calculado no checkout futuro.
