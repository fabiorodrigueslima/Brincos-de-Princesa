import { describe, expect, it, vi } from "vitest";
import { createCustomerAuthService } from "../src/services/customerAuthService.js";
import { hashPassword } from "../src/security/password.js";

describe("customer authentication", () => {
  it("registers with a strong password hash and creates a hashed session", async () => {
    const repository = {
      findByEmail: vi.fn(async () => null),
      create: vi.fn(async (value, passwordHash) => ({
        id: 1,
        email: value.email,
        nome: value.name,
        telefone: value.phone,
        password_hash: passwordHash,
      })),
      createSession: vi.fn(),
    };
    const result = await createCustomerAuthService(repository).register({
      name: "Maria",
      email: "maria@example.com",
      phone: "11999999999",
      password: "uma-senha-forte-123",
    });
    expect(repository.create.mock.calls[0][1]).toMatch(/^scrypt\$/);
    expect(repository.createSession.mock.calls[0][1]).toMatch(/^[a-f0-9]{64}$/);
    expect(result.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
  it("uses a generic error for an unknown account or wrong password", async () => {
    for (const customer of [
      null,
      {
        id: 1,
        ativo: true,
        password_hash: await hashPassword("senha-correta-123"),
        bloqueado_ate: null,
      },
    ]) {
      const repository = {
        findByEmail: async () => customer,
        recordFailure: vi.fn(),
      };
      await expect(
        createCustomerAuthService(repository).login({
          email: "x@example.com",
          password: "senha-errada-123",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_CREDENTIALS",
        message: "Credenciais inválidas.",
      });
    }
  });
  it("stores reset tokens only as hashes and gives no account-existence signal", async () => {
    const repository = {
      findByEmail: async () => ({
        id: 1,
        email: "maria@example.com",
        password_hash: "hash",
      }),
      createReset: vi.fn(),
    };
    const email = { sendPasswordReset: vi.fn() };
    const result = await createCustomerAuthService(repository, email).forgot(
      "maria@example.com",
    );
    expect(repository.createReset.mock.calls[0][1]).toMatch(/^[a-f0-9]{64}$/);
    expect(email.sendPasswordReset).toHaveBeenCalled();
    expect(result.accepted).toBe(true);
  });
});
