# Fase 7 — Pedidos, estoque e pagamentos

## Limite operacional

O projeto não possui transportadora nem gateway definidos. Por isso a criação pública de pedidos continua bloqueada antes de qualquer persistência: uma opção real de frete precisa sobreviver à recotação final. PIX e cartão também permanecem indisponíveis. Nenhuma credencial, cobrança, QR Code, prazo ou confirmação é simulada.

## Pedido transacional e snapshots

`POST /api/v1/orders` exige `Idempotency-Key` e o mesmo payload estrito do checkout com uma opção logística. O backend recota preço, promoção, estoque e frete. Somente depois inicia uma transação que registra chave idempotente, bloqueia variantes em ordem estável, confere novamente preço e estoque, cria cliente convidado, endereço, pedido, snapshots de itens, reservas, movimentos e histórico. Qualquer falha causa rollback.

O pedido armazena nome, contato e snapshot do endereço, produtos, variantes, atributos, preços, quantidades, frete e total. O identificador público possui 64 bits aleatórios e a consulta exige token aleatório separado, cujo hash é persistido. IDs sequenciais não são expostos.

## Idempotência

A chave e o payload recebem SHA-256. Repetição compatível devolve a mesma resposta e o mesmo pedido; payload diferente recebe conflito. A resposta fica na tabela de idempotência por 24 horas para permitir retry, incluindo temporariamente o token entregue ao cliente. Pagamentos recebem uma chave própria repassada ao provider e protegida também por unicidade no banco.

## Estoque, concorrência e expiração

Variantes são bloqueadas com `FOR UPDATE` e atualizadas com condição `estoque - estoque_reservado >= quantidade`. O pedido incrementa apenas `estoque_reservado`; não reduz o físico. A janela técnica vem de `checkout.reservation_minutes`, configurada pela migration 004 inicialmente em 30 minutos.

Expiração é processada oportunisticamente nas operações de pedido: a reserva passa a `EXPIRED`, o reservado é reduzido e o pedido pendente passa a `CANCELLED`, com movimento e histórico. A operação é idempotente. Em produção será necessário um job periódico para liberação pontual mesmo sem tráfego.

Pagamento aprovado reduz `estoque` e `estoque_reservado` exatamente uma vez e transforma a reserva em `CONSUMED`. Eventos repetidos não repetem a baixa. Aprovação tardia após expiração não é aceita automaticamente: o evento fica como falha `LATE_PAYMENT_REQUIRES_REVIEW`, não recria estoque nem marca pedido pago; uma integração futura deverá iniciar estorno ou revisão operacional.

## Pagamento e webhook

`PaymentProvider` separa `createPayment`, `getPayment` e `verifyWebhook`. O valor enviado ao provider vem do pedido consultado pelo token, nunca do frontend. Sem gateway escolhido, o provider retorna `PAYMENT_NOT_CONFIGURED`.

`POST /api/v1/webhooks/payments/:provider` existe como fronteira isolada, mas nenhum JSON é confiado diretamente. O provider precisa autenticar e normalizar o evento antes do processamento. Como não existe gateway, qualquer provedor é rejeitado e não foi inventado algoritmo de assinatura. Quando configurado, `webhook_eventos` impede repetição; transições aprovadas, recusadas e canceladas ocorrem em transação.

PAN e CVV não fazem parte de nenhum schema, endpoint ou tabela. Cartão deverá usar checkout hospedado ou tokenização oficial. PIX deverá vir integralmente do provider.

## Migration 004 e segurança

A migration adiciona apenas a configuração da janela e privilégios mínimos de escrita às tabelas comerciais e respectivas sequências. Migrations anteriores não foram alteradas. Rate limits separados protegem mutações e consulta. Zod, CORS, Helmet, request ID, limite de payload, queries parametrizadas e erros controlados permanecem ativos.

## LGPD e limitações

Cliente convidado, contato e endereço passam a ser persistidos somente quando um pedido válido puder ser criado. A finalidade é execução do pedido, entrega, atendimento e obrigações legais. A política definitiva de retenção e descarte depende da cliente e de requisitos fiscais. Payload integral do gateway não é persistido; apenas hash, identificadores, status e dados operacionais mínimos.

Ficam pendentes: provider de frete, dimensões logísticas, gateway oficial, credenciais sandbox, política de reserva comercial, job de expiração, estorno automatizado, e-mail transacional e cupons.
