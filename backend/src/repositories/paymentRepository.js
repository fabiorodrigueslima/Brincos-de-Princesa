import { createHash } from 'node:crypto';
import { transaction } from "../config/database.js";
import { AppError } from "../utils/AppError.js";

export function createPaymentRepository(runTransaction = transaction) {
  return {
    async prepare(input) {
      return runTransaction(async (client) => {
        await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [input.idempotencyKey]);
        const order = await client.query('SELECT id,status,total FROM app.pedidos WHERE codigo_publico=$1 AND access_token_hash=$2 FOR UPDATE', [input.code, input.tokenHash]);
        if (!order.rowCount) throw new AppError(404, 'ORDER_NOT_FOUND', 'Pedido não encontrado.');
        const existing = await client.query('SELECT * FROM app.pagamentos WHERE idempotency_key=$1', [input.idempotencyKey]);
        if (existing.rowCount) {
          const row = existing.rows[0];
          if (String(row.pedido_id) !== String(order.rows[0].id) || row.metodo !== input.method || row.provedor !== input.provider || String(row.valor) !== input.amount) throw new AppError(409, 'IDEMPOTENCY_KEY_REUSED', 'Chave usada com outros dados.');
          if (!row.checkout_url) throw new AppError(409, 'PAYMENT_INITIALIZATION_PENDING', 'A tentativa anterior aguarda conciliação. Não repita o pagamento.');
          return { replayed: true, checkoutUrl: row.checkout_url, status: row.status, metodo: row.metodo, valor: row.valor };
        }
        if (order.rows[0].status !== 'PENDING_PAYMENT' || String(order.rows[0].total) !== input.amount) throw new AppError(409, 'ORDER_NOT_PAYABLE', 'Pedido não disponível para pagamento.');
        const pending = await client.query("SELECT id FROM app.pagamentos WHERE pedido_id=$1 AND initiation_state IN ('CREATING','UNKNOWN')", [order.rows[0].id]);
        if (pending.rowCount) throw new AppError(409, 'PAYMENT_INITIALIZATION_PENDING', 'Uma tentativa aguarda conciliação.');
        const inserted = await client.query("INSERT INTO app.pagamentos(pedido_id,provedor,idempotency_key,status,metodo,valor,initiation_state) VALUES($1,$2,$3,'PENDING',$4,$5,'CREATING') RETURNING id", [order.rows[0].id,input.provider,input.idempotencyKey,input.method,input.amount]);
        return { id: inserted.rows[0].id };
      });
    },
    async complete(id, external) {
      return runTransaction(async (client) => {
        const result = await client.query("UPDATE app.pagamentos SET gateway_preference_id=$2,checkout_url=$3,initiation_state='READY' WHERE id=$1 AND initiation_state='CREATING' RETURNING status,metodo,valor,gateway_preference_id", [id,external.preferenceId,external.checkoutUrl]);
        if (result.rowCount !== 1) throw new Error('PAYMENT_COMPLETION_CONFLICT');
        return result.rows[0];
      });
    },
    async uncertain(id) {
      return runTransaction(client => client.query("UPDATE app.pagamentos SET initiation_state='UNKNOWN' WHERE id=$1 AND initiation_state='CREATING'", [id]));
    },
    async create(input) {
      return runTransaction(async (client) => {
        const order = await client.query({
          text: `SELECT id,status,total FROM app.pedidos WHERE codigo_publico=$1 AND access_token_hash=$2 FOR UPDATE`,
          values: [input.code, input.tokenHash],
        });
        if (!order.rowCount)
          throw new AppError(404, "ORDER_NOT_FOUND", "Pedido não encontrado.");
        if (order.rows[0].status !== "PENDING_PAYMENT")
          throw new AppError(
            409,
            "ORDER_NOT_PAYABLE",
            "Este pedido não está disponível para pagamento.",
          );
        if (String(order.rows[0].total) !== String(input.amount))
          throw new Error("PAYMENT_AMOUNT_INVARIANT_VIOLATION");
        const result = await client.query({
          text: `INSERT INTO app.pagamentos(pedido_id,provedor,gateway_preference_id,idempotency_key,status,metodo,valor) VALUES($1,$2,$3,$4,'PENDING',$5,$6) ON CONFLICT(idempotency_key) DO NOTHING RETURNING status,metodo,valor,gateway_payment_id,gateway_preference_id`,
          values: [
            order.rows[0].id,
            input.provider,
            input.preferenceId,
            input.idempotencyKey,
            input.method,
            input.amount,
          ],
        });
        if (result.rowCount) return result.rows[0];
        const existing = await client.query({ text: `SELECT pa.status,pa.metodo,pa.valor,pa.gateway_payment_id,pa.gateway_preference_id,pa.pedido_id,pa.provedor FROM app.pagamentos pa WHERE pa.idempotency_key=$1 FOR UPDATE`, values: [input.idempotencyKey] });
        const row = existing.rows[0];
        if (!row || String(row.pedido_id) !== String(order.rows[0].id) || row.provedor !== input.provider || row.metodo !== input.method || String(row.valor) !== String(input.amount)) throw new AppError(409,"IDEMPOTENCY_KEY_REUSED","A chave de idempotência já foi usada com outros dados.");
        return row;
      });
    },

    async processWebhook(event) {
      return runTransaction(async (client) => {
        // Serialize all attempts of the order before locking individual payments.
        await client.query('SELECT id FROM app.pedidos WHERE codigo_publico=$1 FOR UPDATE', [event.reference]);
        const inserted = await client.query({
          text: `INSERT INTO app.webhook_eventos(provedor,gateway_event_id,tipo_evento,payload_hash,assinatura_valida) VALUES($1,$2,$3,$4,TRUE) ON CONFLICT(provedor,gateway_event_id) DO NOTHING RETURNING id`,
          values: [
            event.provider,
            event.eventId,
            event.type,
            event.payloadHash,
          ],
        });
        if (!inserted.rowCount) return { duplicate: true };
        const payment = await client.query({
          text: `SELECT pa.id,pa.pedido_id,pa.status,pa.valor,pa.moeda,pa.metodo,pa.gateway_payment_id,pa.aprovado_em,p.status pedido_status,p.codigo_publico FROM app.pagamentos pa JOIN app.pedidos p ON p.id=pa.pedido_id WHERE pa.provedor=$1 AND p.codigo_publico=$2 AND (pa.gateway_payment_id=$3 OR ($4::text IS NOT NULL AND pa.idempotency_key=$4) OR ($4::text IS NULL AND pa.initiation_state='LEGACY' AND pa.gateway_payment_id IS NULL)) FOR UPDATE OF pa,p`,
          values: [event.provider, event.reference, event.paymentId, event.attemptKey ?? null],
        });
        if (!payment.rowCount) {
          await finishEvent(
            client,
            inserted.rows[0].id,
            "IGNORED",
            "PAYMENT_NOT_FOUND",
          );
          return { ignored: true };
        }
        const exact = payment.rows.filter(row => row.gateway_payment_id === event.paymentId);
        const candidates = exact.length ? exact : payment.rows;
        if (candidates.length !== 1) throw new AppError(409, 'PAYMENT_AMBIGUOUS', 'Pagamento requer conciliação.');
        let state = candidates[0];
        if (String(state.valor) !== event.amount || state.moeda !== event.currency || state.codigo_publico !== event.reference) {
          await finishEvent(client, inserted.rows[0].id, "FAILED", "PAYMENT_RECONCILIATION_FAILED");
          return { rejected: true };
        }
        // Checkout Pro can create multiple payment IDs from the same preference.
        // Persist each verified receipt separately; only one can consume the order stock.
        if (state.gateway_payment_id && state.gateway_payment_id !== event.paymentId && event.attemptKey) {
          const receiptKey = 'receipt:' + createHash('sha256').update(event.provider + ':' + event.paymentId).digest('hex');
          const receipt = await client.query("INSERT INTO app.pagamentos(pedido_id,provedor,gateway_payment_id,idempotency_key,status,metodo,valor,moeda) VALUES($1,$2,$3,$4,'PENDING',$5,$6,$7) RETURNING id,status,gateway_payment_id,aprovado_em",[state.pedido_id,event.provider,event.paymentId,receiptKey,state.metodo,state.valor,state.moeda]);
          state = {...state,...receipt.rows[0]};
        }
        const linked = await client.query({
          text: `UPDATE app.pagamentos SET gateway_payment_id=$1 WHERE id=$2 AND (gateway_payment_id IS NULL OR gateway_payment_id=$1)`,
          values: [event.paymentId, state.id],
        });
        if (linked.rowCount !== 1) throw new AppError(409, 'PAYMENT_ID_CONFLICT', 'Pagamento requer conciliação.');
        if (event.status === "APPROVED") {
          if (["APPROVED","REFUNDED","CHARGEBACK"].includes(state.status)) {
            await finishEvent(client, inserted.rows[0].id, "PROCESSED");
            return { duplicateState: true };
          }
          if (state.pedido_status !== "PENDING_PAYMENT") {
            await finishEvent(
              client,
              inserted.rows[0].id,
              "FAILED",
              "LATE_PAYMENT_REQUIRES_REVIEW",
            );
            return { latePayment: true };
          }
          const reservations = await client.query({
            text: `SELECT id,variante_id,quantidade FROM app.reservas_estoque WHERE pedido_id=$1 AND status='ACTIVE' AND expira_em>now() ORDER BY variante_id FOR UPDATE`,
            values: [state.pedido_id],
          });
          const itemCount = await client.query({
            text: `SELECT count(*)::integer count FROM app.pedido_itens WHERE pedido_id=$1`,
            values: [state.pedido_id],
          });
          if (reservations.rowCount !== itemCount.rows[0].count) {
            await finishEvent(
              client,
              inserted.rows[0].id,
              "FAILED",
              "RESERVATION_NOT_ACTIVE",
            );
            return { latePayment: true };
          }
          for (const reservation of reservations.rows) {
            const stock = await client.query({
              text: `UPDATE app.produto_variantes SET estoque=estoque-$1,estoque_reservado=estoque_reservado-$1 WHERE id=$2 AND estoque >= $1 AND estoque_reservado >= $1 RETURNING estoque-estoque_reservado saldo`,
              values: [reservation.quantidade, reservation.variante_id],
            });
            if (!stock.rowCount) throw new Error("STOCK_INVARIANT_VIOLATION");
            await client.query({
              text: `UPDATE app.reservas_estoque SET status='CONSUMED' WHERE id=$1`,
              values: [reservation.id],
            });
            await client.query({
              text: `INSERT INTO app.movimentos_estoque(variante_id,pedido_id,tipo,quantidade,saldo_apos,motivo) VALUES($1,$2,'SALE',$3,$4,'Pagamento aprovado pelo provedor')`,
              values: [
                reservation.variante_id,
                state.pedido_id,
                -reservation.quantidade,
                stock.rows[0].saldo,
              ],
            });
          }
          await client.query({
            text: `UPDATE app.pagamentos SET status='APPROVED',aprovado_em=now() WHERE id=$1`,
            values: [state.id],
          });
          await client.query({
            text: `UPDATE app.pedidos SET status='PAID' WHERE id=$1`,
            values: [state.pedido_id],
          });
          await client.query({
            text: `INSERT INTO app.pedido_status_historico(pedido_id,status_anterior,status_novo,motivo,origem) VALUES($1,'PENDING_PAYMENT','PAID','Pagamento confirmado por webhook autenticado','WEBHOOK')`,
            values: [state.pedido_id],
          });
          await client.query({text:`INSERT INTO app.email_outbox(event_key,template,recipient,variables) SELECT $1,'payment-confirmed',email_cliente,jsonb_build_object('code',codigo_publico) FROM app.pedidos WHERE id=$2 ON CONFLICT(event_key) DO NOTHING`,values:[`payment-confirmed:${state.pedido_id}`,state.pedido_id]});
          await finishEvent(client, inserted.rows[0].id, "PROCESSED");
          return { approved: true };
        }
        if (
          ["DECLINED", "CANCELLED"].includes(event.status) &&
          !["APPROVED", "REFUNDED", "CHARGEBACK"].includes(state.status)
        ) {
          await client.query({
            text: `UPDATE app.pagamentos SET status=$1 WHERE id=$2`,
            values: [event.status, state.id],
          });
          // A failed attempt must not cancel other attempts for this order.
          // Reservation expiry (or explicit administrative cancellation) releases stock.
        }
        if (event.status === "REFUNDED" && state.status !== "REFUNDED") {
          await client.query({ text: `UPDATE app.pagamentos SET status='REFUNDED' WHERE id=$1`, values: [state.id] });
          const changed = await client.query({ text: `UPDATE app.pedidos SET status='REFUNDED' WHERE id=$1 AND status <> 'REFUNDED' AND $2::boolean RETURNING status`, values: [state.pedido_id, Boolean(state.aprovado_em)] });
          if (changed.rowCount) await client.query({ text: `INSERT INTO app.pedido_status_historico(pedido_id,status_novo,motivo,origem) VALUES($1,'REFUNDED','Estorno confirmado pelo provedor; reposição de estoque requer revisão operacional','WEBHOOK')`, values: [state.pedido_id] });
        }
        if (event.status === "CHARGEBACK" && state.status !== "CHARGEBACK") {
          await client.query({ text: `UPDATE app.pagamentos SET status='CHARGEBACK' WHERE id=$1`, values: [state.id] });
          const changed = await client.query({ text: `UPDATE app.pedidos SET status='CHARGEBACK' WHERE id=$1 AND status <> 'CHARGEBACK' AND $2::boolean RETURNING status`, values: [state.pedido_id, Boolean(state.aprovado_em)] });
          if (changed.rowCount) await client.query({ text: `INSERT INTO app.pedido_status_historico(pedido_id,status_novo,motivo,origem) VALUES($1,'CHARGEBACK','Contestação confirmada pelo provedor; requer revisão operacional','WEBHOOK')`, values: [state.pedido_id] });
        }
        await finishEvent(client, inserted.rows[0].id, "PROCESSED");
        return { processed: true };
      });
    },
  };
}

async function finishEvent(client, id, status, error = null) {
  await client.query({
    text: `UPDATE app.webhook_eventos SET status_processamento=$1,erro_codigo=$2,processado_em=now(),tentativas=tentativas+1 WHERE id=$3`,
    values: [status, error, id],
  });
}

export const paymentRepository = createPaymentRepository();
