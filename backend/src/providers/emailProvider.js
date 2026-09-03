import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

const disabled = {
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
  return {
    async sendPasswordReset({ email, resetUrl }) {
      let response;
      try {
        response = await fetchImpl(config.EMAIL_WEBHOOK_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.EMAIL_WEBHOOK_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            template: "password-reset",
            to: email,
            variables: { resetUrl },
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
    },
  };
}
export const emailProvider =
  env.EMAIL_PROVIDER === "http" ? createHttpEmailProvider() : disabled;
