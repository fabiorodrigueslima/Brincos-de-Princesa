import { transaction } from "../config/database.js";
import { AppError } from "../utils/AppError.js";

const currentPrice = (row) => String(row.preco_promocional ?? row.preco);

export function createOrderRepository(runTransaction = transaction) {
  return {
    async create(input) {
      return runTransaction(async (client) => {
        const insertedKey = await client.query({
          text: `INSERT INTO app.idempotency_keys(escopo,chave_hash,request_hash,expira_em) VALUES('CREATE_ORDER',$1,$2,now()+interval '24 hours') ON CONFLICT (escopo,chave_hash) DO NOTHING RETURNING id`,
          values: [input.keyHash, input.requestHash],
        });
        const keyState = await client.query({
          text: `SELECT id,request_hash,response_body,status_code FROM app.idempotency_keys WHERE escopo='CREATE_ORDER' AND chave_hash=$1 FOR UPDATE`,
          values: [input.keyHash],
        });
        const key = keyState.rows[0];
        if (insertedKey.rowCount === 0) {
          if (key.request_hash !== input.requestHash)
            throw new AppError(
              409,
              "IDEMPOTENCY_KEY_REUSED",
              "A chave de idempotência já foi usada com outros dados.",
            );
          if (key.response_body)
            return { ...key.response_body, replayed: true };
          throw new AppError(
            409,
            "IDEMPOTENCY_IN_PROGRESS",
            "Esta solicitação ainda está sendo processada.",
          );
        }

        await releaseExpiredReservations(client);
        const ids = [...input.quote.items.map((item) => item.variantId)].sort(
          (a, b) => a - b,
        );
        const locked = await client.query({
          text: `SELECT v.id,v.produto_id,v.sku,v.nome,v.atributos,v.preco,v.preco_promocional,v.estoque,v.estoque_reservado,v.ativa,p.nome produto_nome,p.status produto_status FROM app.produto_variantes v JOIN app.produtos p ON p.id=v.produto_id WHERE v.id=ANY($1::bigint[]) ORDER BY v.id FOR UPDATE OF v`,
          values: [ids],
        });
        const variants = new Map(
          locked.rows.map((row) => [Number(row.id), row]),
        );
        for (const item of input.quote.items) {
          const row = variants.get(item.variantId);
          if (!row || !row.ativa || row.produto_status !== "ACTIVE")
            throw new AppError(
              409,
              "CART_CHANGED",
              "Um produto não está mais disponível.",
            );
          if (
            Number(row.estoque) - Number(row.estoque_reservado) <
            item.quantity
          )
            throw new AppError(
              409,
              "INSUFFICIENT_STOCK",
              "O estoque mudou antes da criação do pedido.",
            );
          if (currentPrice(row) !== item.unitPrice)
            throw new AppError(
              409,
              "PRICE_CHANGED",
              "O preço mudou antes da criação do pedido.",
            );
        }

        const customer = await client.query({
          text: `SELECT id FROM app.clientes WHERE id=$1 AND ativo=TRUE FOR UPDATE`,
          values: [input.customerId],
        });
        if (!customer.rowCount)
          throw new AppError(
            401,
            "CUSTOMER_AUTH_REQUIRED",
            "Entre na sua conta para finalizar a compra.",
          );
        await client.query({
          text: `INSERT INTO app.enderecos(cliente_id,cep,rua,numero,complemento,bairro,cidade,uf,destinatario,principal) VALUES($1,$2,$3,$4,NULLIF($5,''),$6,$7,$8,$9,TRUE)`,
          values: [
            customer.rows[0].id,
            input.address.postalCode,
            input.address.street,
            input.address.number,
            input.address.complement,
            input.address.neighborhood,
            input.address.city,
            input.address.state,
            input.customer.name,
          ],
        });
        const order = await client.query({
          text: `INSERT INTO app.pedidos(codigo_publico,access_token_hash,cliente_id,status,email_cliente,nome_cliente,telefone_cliente,endereco_entrega,subtotal,desconto,frete,total,frete_metodo,frete_transportadora,frete_prazo_dias) VALUES($1,$2,$3,'PENDING_PAYMENT',$4,$5,$6,$7,$8,0,$9,$10,$11,$12,$13) RETURNING id,codigo_publico,status,subtotal,frete,total,criado_em`,
          values: [
            input.publicCode,
            input.accessTokenHash,
            customer.rows[0].id,
            input.customer.email.toLowerCase(),
            input.customer.name,
            input.customer.phone,
            input.address,
            input.quote.subtotal,
            input.quote.shipping,
            input.quote.total,
            input.quote.selectedShipping.service,
            input.quote.selectedShipping.carrier,
            input.quote.selectedShipping.estimatedDays,
          ],
        });
        const orderId = order.rows[0].id;
        const config = await client.query(
          `SELECT COALESCE((valor #>> '{}')::integer,30) minutes FROM app.configuracoes WHERE chave='checkout.reservation_minutes'`,
        );
        const minutes = config.rows[0]?.minutes ?? 30;
        for (const item of input.quote.items) {
          const row = variants.get(item.variantId);
          await client.query({
            text: `INSERT INTO app.pedido_itens(pedido_id,produto_id,variante_id,nome_produto,sku,nome_variante,atributos_variante,quantidade,preco_unitario,subtotal) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            values: [
              orderId,
              row.produto_id,
              row.id,
              row.produto_nome,
              row.sku,
              row.nome,
              row.atributos,
              item.quantity,
              item.unitPrice,
              item.subtotal,
            ],
          });
          const reserved = await client.query({
            text: `UPDATE app.produto_variantes SET estoque_reservado=estoque_reservado+$1 WHERE id=$2 AND estoque-estoque_reservado >= $1 RETURNING estoque-estoque_reservado saldo`,
            values: [item.quantity, item.variantId],
          });
          if (!reserved.rowCount)
            throw new AppError(
              409,
              "INSUFFICIENT_STOCK",
              "O estoque mudou antes da reserva.",
            );
          await client.query({
            text: `INSERT INTO app.reservas_estoque(pedido_id,variante_id,quantidade,expira_em) VALUES($1,$2,$3,now()+($4||' minutes')::interval)`,
            values: [orderId, item.variantId, item.quantity, minutes],
          });
          await client.query({
            text: `INSERT INTO app.movimentos_estoque(variante_id,pedido_id,tipo,quantidade,saldo_apos,motivo) VALUES($1,$2,'RESERVATION',$3,$4,'Reserva para pagamento')`,
            values: [
              item.variantId,
              orderId,
              item.quantity,
              reserved.rows[0].saldo,
            ],
          });
        }
        await client.query({
          text: `INSERT INTO app.pedido_status_historico(pedido_id,status_novo,motivo) VALUES($1,'PENDING_PAYMENT','Pedido criado com estoque reservado')`,
          values: [orderId],
        });
        await client.query({text:`INSERT INTO app.email_outbox(event_key,template,recipient,variables) VALUES($1,'order-received',$2,$3) ON CONFLICT(event_key) DO NOTHING`,values:[`order-received:${orderId}`,input.customer.email.toLowerCase(),{code:order.rows[0].codigo_publico,total:order.rows[0].total}]});
        const response = {
          code: order.rows[0].codigo_publico,
          accessToken: input.accessToken,
          status: order.rows[0].status,
          subtotal: order.rows[0].subtotal,
          shipping: order.rows[0].frete,
          total: order.rows[0].total,
          createdAt: order.rows[0].criado_em,
          replayed: false,
        };
        await client.query({
          text: `UPDATE app.idempotency_keys SET status_code=201,response_body=$1,recurso_id=$2 WHERE id=$3`,
          values: [response, String(orderId), key.id],
        });
        return response;
      });
    },

    async findPublic(code, tokenHash) {
      return runTransaction(async (client) => {
        await releaseExpiredReservations(client);
        const result = await client.query({
          text: `SELECT p.codigo_publico,p.status,p.nome_cliente,p.email_cliente,p.subtotal,p.frete,p.frete_metodo,p.frete_transportadora,p.frete_prazo_dias,p.endereco_entrega,p.total,p.criado_em,pa.status pagamento_status,pa.metodo FROM app.pedidos p LEFT JOIN LATERAL (SELECT status,metodo FROM app.pagamentos WHERE pedido_id=p.id ORDER BY id DESC LIMIT 1) pa ON TRUE WHERE p.codigo_publico=$1 AND p.access_token_hash=$2`,
          values: [code, tokenHash],
        });
        if (!result.rowCount) return null;
        const items = await client.query({
          text: `SELECT nome_produto,nome_variante,quantidade,preco_unitario,subtotal FROM app.pedido_itens WHERE pedido_id=(SELECT id FROM app.pedidos WHERE codigo_publico=$1) ORDER BY id`,
          values: [code],
        });
        return { ...result.rows[0], items: items.rows };
      });
    },
    async expireReservations() {
      return runTransaction((client) => releaseExpiredReservations(client));
    },
  };
}

async function releaseExpiredReservations(client) {
  const expired = await client.query(
    `SELECT r.id,r.pedido_id,r.variante_id,r.quantidade,p.status pedido_status FROM app.reservas_estoque r JOIN app.pedidos p ON p.id=r.pedido_id WHERE r.status='ACTIVE' AND r.expira_em<=now() AND p.status='PENDING_PAYMENT' ORDER BY r.variante_id FOR UPDATE OF r`,
  );
  for (const reservation of expired.rows) {
    const released = await client.query({
      text: `UPDATE app.reservas_estoque SET status='EXPIRED' WHERE id=$1 AND status='ACTIVE' RETURNING id`,
      values: [reservation.id],
    });
    if (!released.rowCount) continue;
    const stock = await client.query({
      text: `UPDATE app.produto_variantes SET estoque_reservado=estoque_reservado-$1 WHERE id=$2 AND estoque_reservado >= $1 RETURNING estoque-estoque_reservado saldo`,
      values: [reservation.quantidade, reservation.variante_id],
    });
    if (!stock.rowCount) throw new Error("RESERVATION_INVARIANT_VIOLATION");
    await client.query({
      text: `INSERT INTO app.movimentos_estoque(variante_id,pedido_id,tipo,quantidade,saldo_apos,motivo) VALUES($1,$2,'RELEASE',$3,$4,'Reserva expirada')`,
      values: [
        reservation.variante_id,
        reservation.pedido_id,
        -reservation.quantidade,
        stock.rows[0].saldo,
      ],
    });
    if (reservation.pedido_status === "PENDING_PAYMENT") {
      await client.query({
        text: `UPDATE app.pedidos SET status='CANCELLED',cancelado_em=now() WHERE id=$1 AND status='PENDING_PAYMENT'`,
        values: [reservation.pedido_id],
      });
      await client.query({
        text: `INSERT INTO app.pedido_status_historico(pedido_id,status_anterior,status_novo,motivo) VALUES($1,'PENDING_PAYMENT','CANCELLED','Reserva de estoque expirada')`,
        values: [reservation.pedido_id],
      });
    }
  }
  return { expired: expired.rowCount };
}

export const orderRepository = createOrderRepository();
