import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createConfigurableShippingProvider,
  createSuperFreteShippingProvider,
} from "../src/providers/shippingProvider.js";

const config = {
  SHIPPING_ALLOWED_STATES: "SP, RJ",
  SHIPPING_FREE_ABOVE: "200.00",
  SHIPPING_FIXED_PRICE: "18.90",
  SHIPPING_ESTIMATED_DAYS: 7,
  SHIPPING_LOCAL_PICKUP: true,
  SHIPPING_LOCAL_PICKUP_LABEL: "Retirada",
};
describe("configurable shipping provider", () => {
  it("returns authoritative fixed shipping and local pickup", async () => {
    const options = await createConfigurableShippingProvider(config).quote({
      postalCode: "01001000",
      state: "SP",
      subtotal: "100.00",
    });
    expect(options).toEqual([
      expect.objectContaining({ id: "fixed", price: "18.90" }),
      expect.objectContaining({ id: "local-pickup", price: "0.00" }),
    ]);
  });
  it("applies free shipping from the configured threshold", async () => {
    const [option] = await createConfigurableShippingProvider(config).quote({
      postalCode: "01001000",
      state: "SP",
      subtotal: "200.00",
    });
    expect(option).toMatchObject({ service: "Frete grátis", price: "0.00" });
  });
  it("rejects unavailable regions and malformed postal codes", async () => {
    const provider = createConfigurableShippingProvider(config);
    await expect(
      provider.quote({ postalCode: "bad", state: "SP", subtotal: "1.00" }),
    ).rejects.toMatchObject({ code: "POSTAL_CODE_INVALID" });
    await expect(
      provider.quote({ postalCode: "72000000", state: "DF", subtotal: "1.00" }),
    ).rejects.toMatchObject({ code: "SHIPPING_UNAVAILABLE" });
  });
});

describe("SuperFrete shipping provider", () => {
  afterEach(() => vi.restoreAllMocks());

  const superFreteConfig = {
    SUPERFRETE_API_BASE_URL: "https://sandbox.superfrete.com/api/v0",
    SUPERFRETE_TOKEN: "test-token",
    SUPERFRETE_ORIGIN_CEP: "01001000",
    SUPERFRETE_SERVICES: "1,2",
    EXTERNAL_REQUEST_TIMEOUT_MS: 1000,
  };

  it("sends the authoritative package and normalizes returned options", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([
        { id: 1, name: "PAC", price: 22.5, delivery_time: 8 },
      ]), { status: 200 }),
    );

    const [option] = await createSuperFreteShippingProvider(superFreteConfig).quote({
      postalCode: "20040002",
      state: "RJ",
      items: [{
        quantity: 2,
        weightGrams: 300,
        dimensionsCm: { width: 10, height: 4, length: 20 },
      }],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://sandbox.superfrete.com/api/v0/calculator",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer test-token" }),
        body: JSON.stringify({
          from: { postal_code: "01001000" },
          to: { postal_code: "20040002" },
          services: "1,2",
          package: { weight: 0.6, width: 10, height: 8, length: 20 },
        }),
      }),
    );
    expect(option).toEqual({
      id: "1",
      service: "PAC",
      carrier: "SuperFrete",
      price: "22.5",
      estimatedDays: 8,
    });
  });

  it("rejects a quote without physical product data", async () => {
    await expect(
      createSuperFreteShippingProvider(superFreteConfig).quote({
        postalCode: "20040002",
        state: "RJ",
        items: [{ quantity: 1, weightGrams: null, dimensionsCm: null }],
      }),
    ).rejects.toMatchObject({ code: "SHIPPING_PACKAGE_DATA_MISSING" });
  });
});
