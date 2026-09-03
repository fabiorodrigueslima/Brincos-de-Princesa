import { timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";
import { customerAuthService } from "../services/customerAuthService.js";
import { AppError } from "../utils/AppError.js";

export const CUSTOMER_COOKIE =
  env.NODE_ENV === "production" ? "__Host-bdp_customer" : "bdp_customer";
const cookies = (header = "") =>
  Object.fromEntries(
    header.split(";").flatMap((part) => {
      const at = part.indexOf("=");
      if (at < 1) return [];
      try {
        return [
          [
            decodeURIComponent(part.slice(0, at).trim()),
            decodeURIComponent(part.slice(at + 1).trim()),
          ],
        ];
      } catch {
        return [];
      }
    }),
  );
export async function requireCustomer(req, _res, next) {
  try {
    const token = cookies(req.get("cookie"))[CUSTOMER_COOKIE];
    const customer = await customerAuthService.authenticate(token);
    if (!customer?.ativo)
      return next(
        new AppError(
          401,
          "CUSTOMER_AUTH_REQUIRED",
          "Entre na sua conta para continuar.",
        ),
      );
    req.customer = customer;
    req.customerToken = token;
    return next();
  } catch (error) {
    return next(error);
  }
}
export function requireCustomerCsrf(req, _res, next) {
  const origin = req.get("origin");
  if (!origin || !req.app.get("adminOrigins")?.includes(origin))
    return next(new AppError(403, "CSRF_INVALID", "Origem inválida."));
  const supplied = customerAuthService.hash(req.get("X-CSRF-Token") || "");
  const expected = req.customer.csrf_secret_hash;
  return supplied.length === expected.length &&
    timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
    ? next()
    : next(new AppError(403, "CSRF_INVALID", "Token de segurança inválido."));
}
export const customerCookieOptions = () => ({
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: env.CUSTOMER_SESSION_HOURS * 60 * 60 * 1000,
});
