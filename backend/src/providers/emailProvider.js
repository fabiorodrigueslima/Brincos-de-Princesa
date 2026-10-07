import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

const disabled = {
  async send() { throw new AppError(503, 'EMAIL_NOT_CONFIGURED', 'E-mail não configurado.'); },
  async sendAccountActivation() {
    throw new AppError(503, 'EMAIL_NOT_CONFIGURED', 'Envio de e-mail ainda não está configurado.');
  },
  async sendPasswordReset() {
    if (env.NODE_ENV === "production")
      throw new AppError(
        503,
        "EMAIL_NOT_CONFIGURED",
        "Envio de e-mail ainda não está configurado.",
      );
  },
};
export function createHttpEmailProvider({
  fetchImpl = fetch,
  config = env,
} = {}) {
  const send = async (template, to, variables, idempotencyKey) => {
      if (!['password-reset','account-activation','order-received','payment-confirmed'].includes(template)) throw new AppError(422, 'EMAIL_TEMPLATE_INVALID', 'Template não suportado.');
      let response;
      try {
        response = await fetchImpl(config.EMAIL_WEBHOOK_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.EMAIL_WEBHOOK_TOKEN}`,
            "Content-Type": "application/json",
            ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
          },
          body: JSON.stringify({
            template,
            to,
            variables,
          }),
          signal: AbortSignal.timeout(config.EXTERNAL_REQUEST_TIMEOUT_MS),
        });
      } catch {
        throw new AppError(
          502,
          "EMAIL_PROVIDER_UNAVAILABLE",
          "Não foi possível enviar o e-mail agora.",
        );
      }
      if (!response.ok)
        throw new AppError(
          502,
          "EMAIL_PROVIDER_ERROR",
          "Não foi possível enviar o e-mail agora.",
        );
    };
  return {
    send({ template, to, variables, idempotencyKey }) { return send(template, to, variables, idempotencyKey); },
    sendPasswordReset({ email, resetUrl }) {
      return send('password-reset', email, { resetUrl });
    },
    sendAccountActivation({ email, activationUrl }) {
      return send('account-activation', email, { activationUrl });
    },
  };
}
export const emailProvider =
  env.EMAIL_PROVIDER === "http" ? createHttpEmailProvider() : disabled;
