import { orderService } from "../services/orderService.js";
import { paymentService } from "../services/paymentService.js";

export async function createOrder(req, res) {
  const result = await orderService.create(
    {
      ...req.validated.body,
      customer: {
        name: req.customer.nome,
        email: req.customer.email,
        phone: req.customer.telefone,
      },
      customerId: req.customer.cliente_id,
    },
    req.get("Idempotency-Key"),
  );
  res.status(result.replayed ? 200 : 201).json({ data: result });
}
export async function getOrder(req, res) {
  res.json({
    data: await orderService.get(
      req.validated.params.code,
      req.get("X-Order-Token"),
    ),
  });
}
export async function createPayment(req, res) {
  res
    .status(201)
    .json({
      data: await paymentService.create({
        code: req.validated.params.code,
        token: req.get("X-Order-Token"),
        method: req.validated.body.method,
        idempotencyKey: req.get("Idempotency-Key"),
      }),
    });
}
export async function paymentWebhook(req, res) {
  const dataId = req.query?.data?.id ?? req.query?.["data.id"] ?? req.body?.data?.id ?? req.body?.id;
  res.json({
    data: await paymentService.webhook({
      providerName: req.validated.params.provider,
      signature: req.get("X-Webhook-Signature"),
      requestId: req.get("X-Request-Id"),
      dataId: dataId == null ? undefined : String(dataId),
      payload: req.body,
    }),
  });
}
