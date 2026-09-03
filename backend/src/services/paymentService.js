import { createHash } from "node:crypto";
import { paymentProvider } from "../providers/paymentProvider.js";
import { paymentRepository } from "../repositories/paymentRepository.js";
import { orderService } from "./orderService.js";
import { AppError } from "../utils/AppError.js";

const hash = (value) => createHash("sha256").update(value).digest("hex");

export function createPaymentService({
  provider = paymentProvider,
  repository = paymentRepository,
  orders = orderService,
} = {}) {
  return {
    async create({ code, token, method, idempotencyKey }) {
      if (!idempotencyKey || idempotencyKey.length < 16)
        throw new AppError(
          400,
          "IDEMPOTENCY_KEY_REQUIRED",
          "Chave de idempotência obrigatória.",
        );
      const order = await orders.get(code, token);
      if (order.status !== "PENDING_PAYMENT")
        throw new AppError(
          409,
          "ORDER_NOT_PAYABLE",
          "Este pedido não está disponível para pagamento.",
        );
      const external = await provider.createPayment({
        reference: code,
        amount: String(order.total),
        shipping: String(order.frete),
        items: order.items,
        currency: "BRL",
        method,
        idempotencyKey,
        payer: { name: order.nome_cliente, email: order.email_cliente },
      });
      const persisted = await repository.create({
        code,
        tokenHash: hash(token),
        provider: provider.name,
        preferenceId: external.preferenceId,
        idempotencyKey,
        method,
        amount: String(order.total),
      });
      return { ...persisted, checkoutUrl: external.checkoutUrl };
    },
    async webhook({ providerName, signature, requestId, dataId, payload }) {
      if (providerName !== provider.name)
        throw new AppError(
          404,
          "PAYMENT_PROVIDER_NOT_FOUND",
          "Provedor de pagamento não configurado.",
        );
      const event = await provider.verifyWebhook({
        signature,
        requestId,
        dataId,
        payload,
      });
      return repository.processWebhook({
        ...event,
        provider: provider.name,
        payloadHash: hash(JSON.stringify(payload)),
      });
    },
  };
}

export const paymentService = createPaymentService();
