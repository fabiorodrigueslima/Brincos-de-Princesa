import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

const statusMap = { approved: "APPROVED", authorized: "AUTHORIZED", pending: "PENDING", in_process: "PENDING", rejected: "DECLINED", cancelled: "CANCELLED", refunded: "REFUNDED", charged_back: "CHARGEBACK" };
import { toCents, toDecimal } from '../utils/money.js';
const normalizedAmount = (value) => Number(toDecimal(toCents(value)));

async function json(response, errorCode) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new AppError(502, errorCode, "O provedor de pagamento não concluiu a operação.");
  return data;
}

export function createMercadoPagoProvider({ fetchImpl = fetch, config = env, now = () => Date.now() } = {}) {
  const apiUrl = config.MERCADO_PAGO_API_URL.replace(/\/$/, "");
  const authorization = `Bearer ${config.MERCADO_PAGO_ACCESS_TOKEN}`;
  return {
    name: "mercado-pago",
    async createPayment({ reference, amount, shipping = "0.00", items = [], method, idempotencyKey, payer }) {
      const preferenceItems = items.length ? items.map((item, index) => ({
        id: String(item.variante_id ?? item.variantId ?? item.sku ?? `${reference}-${index}`),
        title: String(item.nome_produto ?? item.productName ?? "Produto"),
        description: String(item.nome_variante ?? item.variantName ?? ""),
        quantity: Number(item.quantidade ?? item.quantity),
        unit_price: normalizedAmount(item.preco_unitario ?? item.unitPrice),
        currency_id: "BRL",
      })) : [{ id: reference, title: `Pedido ${reference}`, quantity: 1, unit_price: normalizedAmount(toDecimal(toCents(amount) - toCents(shipping))), currency_id: "BRL" }];
      const subtotal = preferenceItems.reduce((total, item) => {
        if (!Number.isInteger(item.quantity) || item.quantity < 1) throw new AppError(422, 'PAYMENT_AMOUNT_INVALID', 'Quantidade inválida.');
        return total + toCents(item.unit_price) * item.quantity;
      }, 0);
      if (!Number.isSafeInteger(subtotal) || subtotal + toCents(shipping) !== toCents(amount)) throw new AppError(422, 'PAYMENT_AMOUNT_INVALID', 'Total do pagamento divergente.');
      const response = await fetchImpl(`${apiUrl}/checkout/preferences`, {
        method: "POST",
        headers: { Authorization: authorization, "Content-Type": "application/json", "X-Idempotency-Key": idempotencyKey },
        body: JSON.stringify({
          items: preferenceItems,
          shipments: { mode: "not_specified", cost: normalizedAmount(shipping) },
          payer: { name: payer?.name, email: payer?.email },
          external_reference: reference,
          notification_url: `${config.PUBLIC_BACKEND_URL.replace(/\/$/, "")}/api/v1/webhooks/payments/mercado-pago`,
          back_urls: {
            success: `${config.PUBLIC_FRONTEND_URL.replace(/\/$/, "")}/pedido/${reference}`,
            pending: `${config.PUBLIC_FRONTEND_URL.replace(/\/$/, "")}/pedido/${reference}`,
            failure: `${config.PUBLIC_FRONTEND_URL.replace(/\/$/, "")}/pedido/${reference}`,
          },
          auto_return: "approved",
          metadata: { order_reference: reference, payment_method: method, payment_attempt: idempotencyKey },
        }),
        signal: AbortSignal.timeout(config.EXTERNAL_REQUEST_TIMEOUT_MS),
      });
      const data = await json(response, "PAYMENT_PROVIDER_ERROR");
      if (!data.id || !data.init_point) throw new AppError(502, "PAYMENT_PROVIDER_INVALID_RESPONSE", "Resposta inválida do provedor de pagamento.");
      const checkout = new URL(data.init_point);
      if (checkout.protocol !== 'https:' || (config.NODE_ENV === 'production' && !(checkout.hostname === 'www.mercadopago.com.br' || checkout.hostname.endsWith('.mercadopago.com.br')))) throw new AppError(502,'PAYMENT_PROVIDER_INVALID_RESPONSE','Endereço de pagamento inválido.');
      return { preferenceId: String(data.id), checkoutUrl: String(data.init_point) };
    },
    async verifyWebhook({ signature, requestId, dataId, payload }) {
      const parts = Object.fromEntries(String(signature || "").split(",").map((part) => part.trim().split("=", 2)));
      if (!/^\d{10,13}$/.test(parts.ts ?? '') || !/^[a-f0-9]{64}$/i.test(parts.v1 ?? '') || typeof requestId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(requestId) || typeof dataId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(dataId)) throw new AppError(401, "INVALID_WEBHOOK_SIGNATURE", "Assinatura do webhook inválida.");
      const timestamp = Number(parts.ts) * (parts.ts.length <= 10 ? 1000 : 1);
      if (Math.abs(now() - timestamp) > (config.WEBHOOK_MAX_AGE_SECONDS ?? 600) * 1000) throw new AppError(401, 'INVALID_WEBHOOK_SIGNATURE', 'Assinatura expirada.');
      if (!payload || typeof payload !== 'object' || Array.isArray(payload) || (payload.data?.id != null && String(payload.data.id).toLowerCase() !== dataId.toLowerCase())) throw new AppError(400, 'INVALID_WEBHOOK_PAYLOAD', 'Notificação inválida.');
      const expected = createHmac("sha256", config.MERCADO_PAGO_WEBHOOK_SECRET).update(`id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`).digest("hex");
      if (expected.length !== parts.v1.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1.toLowerCase()))) throw new AppError(401, "INVALID_WEBHOOK_SIGNATURE", "Assinatura do webhook inválida.");
      const response = await fetchImpl(`${apiUrl}/v1/payments/${encodeURIComponent(dataId)}`, { headers: { Authorization: authorization, Accept: "application/json" }, signal: AbortSignal.timeout(config.EXTERNAL_REQUEST_TIMEOUT_MS) });
      const payment = await json(response, "PAYMENT_LOOKUP_FAILED");
      const status = statusMap[payment.status];
      if (String(payment.id) !== dataId || !status || !payment.external_reference || payment.transaction_amount == null || !payment.currency_id) throw new AppError(422, "PAYMENT_DATA_INVALID", "Dados de pagamento inválidos.");
      return { eventId: `${payment.id}:${payment.status}:${payment.date_last_updated ?? "current"}`, attemptKey: payment.metadata?.payment_attempt, type: String(payload?.action ?? "payment.updated"), paymentId: String(payment.id), reference: String(payment.external_reference), status, amount: toDecimal(toCents(payment.transaction_amount)), currency: String(payment.currency_id) };
    },
  };
}

const disabled = {
  name: "disabled",
  async createPayment() { throw new AppError(503, "PAYMENT_NOT_CONFIGURED", "Nenhum gateway de pagamento está configurado."); },
  async getPayment() { throw new AppError(503, "PAYMENT_NOT_CONFIGURED", "Nenhum gateway de pagamento está configurado."); },
  async verifyWebhook() { throw new AppError(404, "PAYMENT_PROVIDER_NOT_FOUND", "Provedor de pagamento não configurado."); },
};

export const paymentProvider = env.PAYMENT_PROVIDER === "mercado-pago" ? createMercadoPagoProvider({ config: env }) : disabled;
