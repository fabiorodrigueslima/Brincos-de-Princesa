import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createMercadoPagoProvider } from "../src/providers/paymentProvider.js";

const config = {
  MERCADO_PAGO_API_URL: "https://api.mercadopago.test",
  MERCADO_PAGO_ACCESS_TOKEN: "TEST-token-not-real",
  MERCADO_PAGO_WEBHOOK_SECRET: "test-webhook-secret-not-real",
  PUBLIC_BACKEND_URL: "https://api.example.com",
  PUBLIC_FRONTEND_URL: "https://shop.example.com",
  EXTERNAL_REQUEST_TIMEOUT_MS: 1000,
};

const jsonResponse = (body, ok = true) => ({ ok, json: async () => body });

describe("Mercado Pago Checkout Pro provider", () => {
  it("creates a server-side preference with authoritative amount and webhook URL", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        id: "pref-1",
        init_point: "https://mercadopago.test/checkout/pref-1",
      }),
    );
    const provider = createMercadoPagoProvider({ fetchImpl, config });
    const result = await provider.createPayment({
      reference: "BP-1234567890ABCDEF",
      amount: "120.50",
      method: "PIX",
      idempotencyKey: "1234567890abcdef",
      payer: { name: "Maria", email: "maria@example.com" },
    });
    const [, request] = fetchImpl.mock.calls[0];
    const body = JSON.parse(request.body);
    expect(result).toEqual({
      preferenceId: "pref-1",
      checkoutUrl: "https://mercadopago.test/checkout/pref-1",
    });
    expect(body.items[0].unit_price).toBe(120.5);
    expect(body.notification_url).toBe(
      "https://api.example.com/api/v1/webhooks/payments/mercado-pago",
    );
    expect(request.headers.Authorization).not.toBeUndefined();
  });

  it("validates the webhook signature then confirms payment server-to-server", async () => {
    const dataId = "98765";
    const requestId = "request-1";
    const ts = "1704908010";
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const signature = `ts=${ts},v1=${createHmac("sha256", config.MERCADO_PAGO_WEBHOOK_SECRET).update(manifest).digest("hex")}`;
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        id: 98765,
        external_reference: "BP-1234567890ABCDEF",
        status: "approved",
        transaction_amount: 120.5,
        currency_id: "BRL",
      }),
    );
    const event = await createMercadoPagoProvider({
      fetchImpl,
      config,
    }).verifyWebhook({
      signature,
      requestId,
      dataId,
      payload: { action: "payment.updated" },
    });
    expect(event).toMatchObject({
      paymentId: "98765",
      reference: "BP-1234567890ABCDEF",
      status: "APPROVED",
      amount: "120.50",
      currency: "BRL",
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.mercadopago.test/v1/payments/98765",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: expect.any(String) }),
      }),
    );
  });

  it("rejects a forged webhook without consulting the payment API", async () => {
    const fetchImpl = vi.fn();
    await expect(
      createMercadoPagoProvider({ fetchImpl, config }).verifyWebhook({
        signature: "ts=1,v1=forged",
        requestId: "r",
        dataId: "1",
        payload: {},
      }),
    ).rejects.toMatchObject({ code: "INVALID_WEBHOOK_SIGNATURE" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
