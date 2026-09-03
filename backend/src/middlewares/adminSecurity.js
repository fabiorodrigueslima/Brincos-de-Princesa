import { timingSafeEqual } from "node:crypto";
import { adminAuthService } from "../services/adminAuthService.js";
import { AppError } from "../utils/AppError.js";

export const ADMIN_COOKIE = "__Host-bdp_admin";
export function sensitiveNoStore(_req, res, next) {
  res.setHeader("Cache-Control", "no-store");
  return next();
}

const parseCookies = (header = "") =>
  Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim().split("=").map(decodeURIComponent))
      .filter(([key, value]) => key && value),
  );

export async function requireAdmin(req, _res, next) {
  try {
    const token = parseCookies(req.get("cookie"))[ADMIN_COOKIE];
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token))
      return next(
        new AppError(
          401,
          "ADMIN_AUTH_REQUIRED",
          "Sessão administrativa necessária.",
        ),
      );
    const session = await adminAuthService.authenticate(token);
    if (!session?.ativo)
      return next(
        new AppError(
          401,
          "ADMIN_AUTH_REQUIRED",
          "Sessão administrativa necessária.",
        ),
      );
    req.admin = session;
    req.adminToken = token;
    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireRole(...roles) {
  return (req, _res, next) =>
    roles.includes(req.admin.papel)
      ? next()
      : next(
          new AppError(
            403,
            "ADMIN_FORBIDDEN",
            "Você não possui permissão para esta ação.",
          ),
        );
}

export function requireCsrf(req, _res, next) {
  const origin = req.get("origin");
  const allowedOrigin = origin && new URL(origin).origin;
  if (!allowedOrigin || !req.app.get("adminOrigins")?.includes(allowedOrigin))
    return next(
      new AppError(403, "CSRF_INVALID", "Origem administrativa inválida."),
    );
  const supplied = req.get("X-CSRF-Token") ?? "";
  const suppliedHash = adminAuthService.hash(supplied);
  const expected = req.admin.csrf_secret_hash;
  const valid =
    suppliedHash.length === expected.length &&
    timingSafeEqual(Buffer.from(suppliedHash), Buffer.from(expected));
  return valid
    ? next()
    : next(new AppError(403, "CSRF_INVALID", "Token de segurança inválido."));
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 8 * 60 * 60 * 1000,
  };
}
