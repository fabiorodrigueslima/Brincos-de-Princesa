import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app.js";

describe("orders API security boundary", () => {
  it("requires authentication before inspecting an order payload", async () => {
    expect(
      (await request(app).post("/api/v1/orders").send({ items: [] })).status,
    ).toBe(401);
  });
  it("does not expose sequential order identifiers", async () => {
    expect(
      (await request(app).get("/api/v1/orders/1").set("X-Order-Token", "x"))
        .status,
    ).toBe(400);
  });
  it("prevents caching of protected order responses", async () => {
    const response = await request(app)
      .get("/api/v1/orders/BP-1234567890ABCDEF")
      .set("X-Order-Token", "invalid");
    expect(response.headers["cache-control"]).toContain("no-store");
    expect(response.headers.pragma).toBe("no-cache");
  });
  it("requires a valid public code before payment", async () => {
    expect(
      (
        await request(app)
          .post("/api/v1/orders/1/payments")
          .send({ method: "PIX" })
      ).status,
    ).toBe(400);
  });
  it("rejects unconfigured webhook providers without trusting paid in JSON", async () => {
    const response = await request(app)
      .post("/api/v1/webhooks/payments/forged")
      .send({ status: "paid" });
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("PAYMENT_PROVIDER_NOT_FOUND");
  });
});
