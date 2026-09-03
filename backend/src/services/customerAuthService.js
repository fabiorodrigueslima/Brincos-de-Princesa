import { createHash, randomBytes } from "node:crypto";
import { env } from "../config/env.js";
import { customerRepository } from "../repositories/customerRepository.js";
import { hashPassword, verifyPassword } from "../security/password.js";
import { AppError } from "../utils/AppError.js";
import { emailProvider } from "../providers/emailProvider.js";

const hash = (value) => createHash("sha256").update(value).digest("hex");
const randomToken = () => randomBytes(32).toString("base64url");

export function createCustomerAuthService(
  repository = customerRepository,
  email = emailProvider,
) {
  const session = async (customer) => {
    const token = randomToken();
    const csrf = randomToken();
    await repository.createSession(
      customer.id,
      hash(token),
      hash(csrf),
      env.CUSTOMER_SESSION_HOURS,
    );
    return {
      token,
      csrf,
      user: {
        id: Number(customer.id),
        name: customer.nome,
        email: customer.email,
        phone: customer.telefone,
      },
    };
  };
  return {
    hash,
    async register(value) {
      const existing = await repository.findByEmail(value.email);
      if (existing?.password_hash)
        throw new AppError(
          409,
          "ACCOUNT_EXISTS",
          "Já existe uma conta para este e-mail.",
        );
      let customer;
      if (existing) {
        const passwordHash = await hashPassword(value.password);
        customer = await repository.updateGuestAccount(
          existing.id,
          value,
          passwordHash,
        );
      } else
        customer = await repository.create(
          value,
          await hashPassword(value.password),
        );
      return session(customer);
    },
    async login(value) {
      const customer = await repository.findByEmail(value.email);
      const valid =
        customer?.ativo &&
        !customer.anonimizado_em &&
        customer.password_hash &&
        (!customer.bloqueado_ate ||
          new Date(customer.bloqueado_ate) <= new Date()) &&
        (await verifyPassword(value.password, customer.password_hash));
      if (!valid) {
        if (customer) await repository.recordFailure(customer.id);
        throw new AppError(
          401,
          "INVALID_CREDENTIALS",
          "Credenciais inválidas.",
        );
      }
      await repository.recordSuccess(customer.id);
      return session(customer);
    },
    async authenticate(token) {
      return token ? repository.findSession(hash(token)) : null;
    },
    async refreshCsrf(sessionValue) {
      const csrf = randomToken();
      await repository.rotateCsrf(sessionValue.id, hash(csrf));
      return csrf;
    },
    async logout(token) {
      if (token) await repository.revoke(hash(token));
    },
    async changePassword(customerId, currentPassword, newPassword) {
      const current = await repository.findById(customerId);
      if (
        !current ||
        !(await verifyPassword(currentPassword, current.password_hash))
      )
        throw new AppError(401, "INVALID_CREDENTIALS", "Senha atual inválida.");
      await repository.updatePassword(
        customerId,
        await hashPassword(newPassword),
      );
    },
    async forgot(emailAddress) {
      const customer = await repository.findByEmail(emailAddress);
      if (!customer?.password_hash) return { accepted: true };
      const token = randomToken();
      await repository.createReset(customer.id, hash(token));
      await email.sendPasswordReset({
        email: customer.email,
        resetUrl: `${env.PUBLIC_FRONTEND_URL ?? "http://localhost:5173"}/redefinir-senha?token=${encodeURIComponent(token)}`,
      });
      return {
        accepted: true,
        ...(env.NODE_ENV === "development"
          ? { developmentResetToken: token }
          : {}),
      };
    },
    async reset(token, password) {
      await repository.consumeReset(hash(token), await hashPassword(password));
      return { reset: true };
    },
  };
}
export const customerAuthService = createCustomerAuthService();
