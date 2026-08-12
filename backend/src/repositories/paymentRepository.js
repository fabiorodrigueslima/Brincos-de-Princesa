import { transaction } from '../config/database.js'
import { AppError } from '../utils/AppError.js'

export function createPaymentRepository(runTransaction = transaction) {
  return {
    async create(input) {
      return runTransaction(async (client) => {
        const order = await client.query({ text: `SELECT id,status,total FROM app.pedidos WHERE codigo_publico=$1 AND access_token_hash=$2 FOR UPDATE`, values: [input.code, input.tokenHash] })
        if (!order.rowCount) throw new AppError(404, 'ORDER_NOT_FOUND', 'Pedido não encontrado.')
        if (order.rows[0].status !== 'PENDING_PAYMENT') throw new AppError(409, 'ORDER_NOT_PAYABLE', 'Este pedido não está disponível para pagamento.')
        if (String(order.rows[0].total) !== String(input.amount)) throw new Error('PAYMENT_AMOUNT_INVARIANT_VIOLATION')
        const result = await client.query({ text: `INSERT INTO app.pagamentos(pedido_id,provedor,gateway_payment_id,idempotency_key,status,metodo,valor) VALUES($1,$2,$3,$4,'PENDING',$5,$6) ON CONFLICT(idempotency_key) DO UPDATE SET idempotency_key=EXCLUDED.idempotency_key RETURNING status,metodo,valor,gateway_payment_id`, values: [order.rows[0].id, input.provider, input.externalId, input.idempotencyKey, input.method, input.amount] })
        return result.rows[0]
      })
    },

    async processWebhook(event) {
      return runTransaction(async (client) => {
        const inserted = await client.query({ text: `INSERT INTO app.webhook_eventos(provedor,gateway_event_id,tipo_evento,payload_hash,assinatura_valida) VALUES($1,$2,$3,$4,TRUE) ON CONFLICT(provedor,gateway_event_id) DO NOTHING RETURNING id`, values: [event.provider, event.eventId, event.type, event.payloadHash] })
        if (!inserted.rowCount) return { duplicate: true }
        const payment = await client.query({ text: `SELECT pa.id,pa.pedido_id,pa.status,p.status pedido_status FROM app.pagamentos pa JOIN app.pedidos p ON p.id=pa.pedido_id WHERE pa.provedor=$1 AND pa.gateway_payment_id=$2 FOR UPDATE OF pa,p`, values: [event.provider, event.paymentId] })
        if (!payment.rowCount) { await finishEvent(client, inserted.rows[0].id, 'IGNORED', 'PAYMENT_NOT_FOUND'); return { ignored: true } }
        const state = payment.rows[0]
        if (event.status === 'APPROVED') {
          if (state.status === 'APPROVED') { await finishEvent(client, inserted.rows[0].id, 'PROCESSED'); return { duplicateState: true } }
          if (state.pedido_status !== 'PENDING_PAYMENT') { await finishEvent(client, inserted.rows[0].id, 'FAILED', 'LATE_PAYMENT_REQUIRES_REVIEW'); return { latePayment: true } }
          const reservations = await client.query({ text: `SELECT id,variante_id,quantidade FROM app.reservas_estoque WHERE pedido_id=$1 AND status='ACTIVE' AND expira_em>now() ORDER BY variante_id FOR UPDATE`, values: [state.pedido_id] })
          const itemCount = await client.query({ text: `SELECT count(*)::integer count FROM app.pedido_itens WHERE pedido_id=$1`, values: [state.pedido_id] })
          if (reservations.rowCount !== itemCount.rows[0].count) { await finishEvent(client, inserted.rows[0].id, 'FAILED', 'RESERVATION_NOT_ACTIVE'); return { latePayment: true } }
          for (const reservation of reservations.rows) {
            const stock = await client.query({ text: `UPDATE app.produto_variantes SET estoque=estoque-$1,estoque_reservado=estoque_reservado-$1 WHERE id=$2 AND estoque >= $1 AND estoque_reservado >= $1 RETURNING estoque-estoque_reservado saldo`, values: [reservation.quantidade, reservation.variante_id] })
            if (!stock.rowCount) throw new Error('STOCK_INVARIANT_VIOLATION')
            await client.query({ text: `UPDATE app.reservas_estoque SET status='CONSUMED' WHERE id=$1`, values: [reservation.id] })
            await client.query({ text: `INSERT INTO app.movimentos_estoque(variante_id,pedido_id,tipo,quantidade,saldo_apos,motivo) VALUES($1,$2,'SALE',$3,$4,'Pagamento aprovado pelo provedor')`, values: [reservation.variante_id, state.pedido_id, -reservation.quantidade, stock.rows[0].saldo] })
          }
          await client.query({ text: `UPDATE app.pagamentos SET status='APPROVED',aprovado_em=now() WHERE id=$1`, values: [state.id] })
          await client.query({ text: `UPDATE app.pedidos SET status='PAID' WHERE id=$1`, values: [state.pedido_id] })
          await client.query({ text: `INSERT INTO app.pedido_status_historico(pedido_id,status_anterior,status_novo,motivo) VALUES($1,'PENDING_PAYMENT','PAID','Pagamento confirmado por webhook autenticado')`, values: [state.pedido_id] })
          await finishEvent(client, inserted.rows[0].id, 'PROCESSED')
          return { approved: true }
        }
        if (['DECLINED', 'CANCELLED'].includes(event.status) && !['APPROVED', 'REFUNDED', 'CHARGEBACK'].includes(state.status)) {
          await client.query({ text: `UPDATE app.pagamentos SET status=$1 WHERE id=$2`, values: [event.status, state.id] })
          await releaseOrder(client, state.pedido_id, `Pagamento ${event.status.toLowerCase()}`)
        }
        await finishEvent(client, inserted.rows[0].id, 'PROCESSED')
        return { processed: true }
      })
    },
  }
}

async function finishEvent(client, id, status, error = null) { await client.query({ text: `UPDATE app.webhook_eventos SET status_processamento=$1,erro_codigo=$2,processado_em=now(),tentativas=tentativas+1 WHERE id=$3`, values: [status, error, id] }) }
async function releaseOrder(client, orderId, reason) {
  const reservations = await client.query({ text: `SELECT id,variante_id,quantidade FROM app.reservas_estoque WHERE pedido_id=$1 AND status='ACTIVE' FOR UPDATE`, values: [orderId] })
  for (const reservation of reservations.rows) {
    const stock = await client.query({ text: `UPDATE app.produto_variantes SET estoque_reservado=estoque_reservado-$1 WHERE id=$2 AND estoque_reservado >= $1 RETURNING estoque-estoque_reservado saldo`, values: [reservation.quantidade, reservation.variante_id] })
    if (!stock.rowCount) throw new Error('RESERVATION_INVARIANT_VIOLATION')
    await client.query({ text: `UPDATE app.reservas_estoque SET status='RELEASED' WHERE id=$1`, values: [reservation.id] })
    await client.query({ text: `INSERT INTO app.movimentos_estoque(variante_id,pedido_id,tipo,quantidade,saldo_apos,motivo) VALUES($1,$2,'RELEASE',$3,$4,$5)`, values: [reservation.variante_id, orderId, -reservation.quantidade, stock.rows[0].saldo, reason] })
  }
  const changed = await client.query({ text: `UPDATE app.pedidos SET status='CANCELLED',cancelado_em=now() WHERE id=$1 AND status='PENDING_PAYMENT' RETURNING id`, values: [orderId] })
  if (changed.rowCount) await client.query({ text: `INSERT INTO app.pedido_status_historico(pedido_id,status_anterior,status_novo,motivo) VALUES($1,'PENDING_PAYMENT','CANCELLED',$2)`, values: [orderId, reason] })
}

export const paymentRepository = createPaymentRepository()
