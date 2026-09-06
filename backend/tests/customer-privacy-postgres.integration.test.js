import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { customerRepository } from "../src/repositories/customerRepository.js";
import { createCustomerAuthService } from "../src/services/customerAuthService.js";

const { Client } = pg;
const url = process.env.TEST_DATABASE_ADMIN_URL;
const suffix = `${process.pid}-${Date.now()}`;
let admin;
let customerId;
let registeredCustomerId;
let registeredSessionTokenHash;

describe("privacy requests with isolated PostgreSQL", () => {
  beforeAll(async () => {
    admin = new Client({ connectionString: url });
    await admin.connect();
    customerId = (await admin.query({ text: `INSERT INTO app.clientes(email,nome,sobrenome) VALUES($1,'Cliente privacidade','') RETURNING id`, values: [`privacy-${suffix}@example.com`] })).rows[0].id;
  });
  afterAll(async () => {
    if (!admin) return;
    await admin.query({ text: `DELETE FROM app.privacy_requests WHERE cliente_id=$1`, values: [customerId] });
    await admin.query({ text: `DELETE FROM app.clientes WHERE id=$1`, values: [customerId] });
    if (registeredCustomerId) {
      await admin.query({ text: `DELETE FROM app.cliente_sessoes WHERE cliente_id=$1`, values: [registeredCustomerId] });
      await admin.query({ text: `DELETE FROM app.clientes WHERE id=$1`, values: [registeredCustomerId] });
    }
    await admin.end();
  });
  it("persists one open request of each type and rejects abuse by duplication", async () => {
    await expect(customerRepository.createPrivacyRequest(customerId,"DELETION")).resolves.toMatchObject({ tipo:"DELETION",status:"OPEN" });
    await expect(customerRepository.createPrivacyRequest(customerId,"DELETION")).rejects.toMatchObject({ code:"PRIVACY_REQUEST_EXISTS" });
    expect((await admin.query({ text:`SELECT count(*)::integer count FROM app.privacy_requests WHERE cliente_id=$1`,values:[customerId] })).rows[0].count).toBe(1);
  });

  it("registers a customer with a password hash and a persisted session", async () => {
    const service = createCustomerAuthService(customerRepository);
    const result = await service.register({
      name: "Cliente registro",
      email: `register-${suffix}@example.com`,
      phone: "+55 11 99999-0000",
      password: "Senha de registro 123!",
    });
    registeredCustomerId = result.user.id;
    registeredSessionTokenHash = service.hash(result.token);

    const persisted = await admin.query({
      text: `SELECT c.password_hash,s.token_hash FROM app.clientes c JOIN app.cliente_sessoes s ON s.cliente_id=c.id WHERE c.id=$1 AND s.token_hash=$2`,
      values: [registeredCustomerId, registeredSessionTokenHash],
    });
    expect(persisted.rowCount).toBe(1);
    expect(persisted.rows[0].password_hash).toMatch(/^scrypt\$/);
  });
});
