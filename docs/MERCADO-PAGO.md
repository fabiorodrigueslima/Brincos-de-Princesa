# Mercado Pago — Checkout Pro

O projeto possui um adaptador de Checkout Pro baseado na API oficial de Preferências. O Access Token e a assinatura secreta permanecem exclusivamente no backend. O frontend recebe somente a URL de redirecionamento do checkout hospedado.

## Configuração

Defina no ambiente da API, nunca no Git:

```env
PAYMENT_PROVIDER=mercado-pago
MERCADO_PAGO_ACCESS_TOKEN=
MERCADO_PAGO_WEBHOOK_SECRET=
PUBLIC_BACKEND_URL=https://api.seudominio.com.br
PUBLIC_FRONTEND_URL=https://www.seudominio.com.br
```

Cadastre no painel Mercado Pago a URL HTTPS `PUBLIC_BACKEND_URL/api/v1/webhooks/payments/mercado-pago`, selecione eventos de pagamentos e copie a assinatura secreta gerada para o secret manager da API.

## Fluxo e garantias

1. O backend recalcula preço, frete e estoque e cria um pedido com reserva.
2. O backend cria a preferência usando o total persistido e envia o cliente ao Checkout Pro.
3. O retorno visual não aprova o pedido.
4. O webhook valida `x-signature`, consulta o pagamento diretamente na API do Mercado Pago e compara referência, valor e moeda.
5. Somente então uma transação idempotente aprova pagamento, baixa estoque e atualiza o pedido.

Eventos repetidos são deduplicados. Pagamentos tardios, depois da expiração da reserva, não baixam estoque e exigem revisão/estorno. Estornos atualizam pedido e pagamento, mas a reposição física de estoque é deliberadamente manual. Contestações atualizam o pagamento para revisão operacional.

## Sandbox

Use credenciais de teste e contas de teste do Mercado Pago, uma URL HTTPS acessível para a API e a URL de webhook de teste configurada no painel. Aplique a migration `006_mercado_pago_checkout.sql` antes do teste. Valide aprovação, pendência, recusa, evento repetido, estorno e pagamento após expiração. Nunca use um cartão ou cobrança real nos testes automatizados.

## Produção

1. Conclua primeiro todo o roteiro Sandbox com contas de teste separadas para vendedor e comprador.
2. Ative as credenciais de produção no painel da aplicação.
3. Armazene Access Token e assinatura secreta no secret manager da API.
4. Cadastre a URL HTTPS de produção e habilite eventos de pagamento.
5. Defina as URLs públicas finais e `PAYMENT_PROVIDER=mercado-pago`.
6. Faça uma compra controlada de baixo valor e confirme pedido, pagamento, webhook e estoque.
7. Configure alertas para webhooks rejeitados, pagamentos tardios, estornos e chargebacks.

Nunca reutilize credenciais de teste em produção, nunca exponha a credencial privada ao Vite e nunca considere `back_urls` como confirmação financeira.
