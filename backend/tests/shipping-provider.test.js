import { describe, expect, it } from "vitest";
import { createConfigurableShippingProvider } from "../src/providers/shippingProvider.js";

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
