# Fase 6 — Checkout, endereço e frete

## Fluxo e dados

O checkout público em `/checkout` possui quatro etapas: identificação, endereço, entrega e revisão. Carrinho vazio recebe orientação para voltar à loja. Nome, e-mail, telefone e endereço ficam somente na memória React; não são gravados no `localStorage` nem no banco. O carrinho continua persistindo somente `variantId` e quantidade. CPF não é coletado porque ainda não há finalidade confirmada.

O endereço usa CEP normalizado com oito dígitos, logradouro, número (inclusive `S/N`), complemento opcional, bairro, cidade e UF. O preenchimento assistido passa pela API própria e por adapter da BrasilAPI. A URL-base vem de `POSTAL_CODE_PROVIDER_URL`, há timeout configurável e o preenchimento manual permanece disponível em caso de erro.

## Frete e cotação autoritativa

`POST /api/v1/checkout/quote` aceita apenas itens, identificação, endereço e, opcionalmente, o identificador de opção logística. O backend recarrega variante, produto, preço atual, promoção válida e estoque. Subtotal, frete e total são calculados no servidor em centavos inteiros. Valores financeiros do navegador são rejeitados.

Não existem credenciais de transportadora nem altura, largura e comprimento logísticos confiáveis. Por isso o provider de produção retorna `SHIPPING_NOT_CONFIGURED`; nenhum preço ou prazo é simulado. O contrato `quote({ postalCode, items })` está isolado e os testes usam doubles controlados.

## Banco, segurança e LGPD

Nenhuma migration foi necessária. `clientes`, `enderecos`, `pedidos`, `pedido_itens`, `reservas_estoque` e `configuracoes` foram auditadas, mas não são gravadas nesta fase. Reserva e baixa de estoque permanecem para a Fase 7.

Zod rejeita campos inesperados, quantidades inválidas, CEP malicioso e valores forjados. Endpoints sensíveis possuem limite de 40 requisições por 15 minutos. Helmet, CORS, limite de payload, request ID, queries parametrizadas e tratamento centralizado permanecem ativos. Logs não recebem o payload do checkout.

Para habilitar entrega real serão necessários provider/credenciais, CEP de origem e dados logísticos confiáveis. A revisão aceita opções reais quando configuradas, mas a continuação para pagamento permanece desabilitada. Nenhum pedido, pagamento ou reserva é criado.
