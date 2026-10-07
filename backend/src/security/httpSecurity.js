import { PostgresRateLimitStore } from './postgresRateLimitStore.js';
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { env } from "../config/env.js";

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: "same-site" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  strictTransportSecurity: env.NODE_ENV === "production" ? undefined : false,
});

export const corsPolicy = cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin || env.frontendOrigins.includes(origin))
      return callback(null, true);
    return callback(new Error("Origem não autorizada"));
  },
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "X-CSRF-Token",
    "X-Request-Id",
    "X-Order-Token",
    "Idempotency-Key",
  ],
  maxAge: 600,
});

export const publicRateLimit = rateLimit({
  store: env.NODE_ENV === 'production' || env.RATE_LIMIT_STORE === 'postgres' ? new PostgresRateLimitStore('publicRateLimit') : undefined,
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Muitas solicitações. Tente novamente mais tarde.",
    },
  },
});

export const checkoutRateLimit = rateLimit({
  store: env.NODE_ENV === 'production' || env.RATE_LIMIT_STORE === 'postgres' ? new PostgresRateLimitStore('checkoutRateLimit') : undefined,
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Muitas consultas de checkout. Aguarde e tente novamente.",
    },
  },
});

export const orderMutationRateLimit = rateLimit({
  store: env.NODE_ENV === 'production' || env.RATE_LIMIT_STORE === 'postgres' ? new PostgresRateLimitStore('orderMutationRateLimit') : undefined,
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Muitas tentativas. Aguarde antes de tentar novamente.",
    },
  },
});
export const orderStatusRateLimit = rateLimit({
  store: env.NODE_ENV === 'production' || env.RATE_LIMIT_STORE === 'postgres' ? new PostgresRateLimitStore('orderStatusRateLimit') : undefined,
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Muitas consultas. Aguarde antes de tentar novamente.",
    },
  },
});
export const adminLoginRateLimit = rateLimit({
  store: env.NODE_ENV === 'production' || env.RATE_LIMIT_STORE === 'postgres' ? new PostgresRateLimitStore('adminLoginRateLimit') : undefined,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Muitas tentativas de acesso. Aguarde e tente novamente.",
    },
  },
});

export const customerAuthRateLimit = rateLimit({
  store: env.NODE_ENV === 'production' || env.RATE_LIMIT_STORE === 'postgres' ? new PostgresRateLimitStore('customerAuthRateLimit') : undefined,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Muitas tentativas de acesso. Aguarde e tente novamente.",
    },
  },
});

export const customerRegistrationRateLimit = rateLimit({windowMs:900000,limit:5,store:env.NODE_ENV==='production'||env.RATE_LIMIT_STORE==='postgres'?new PostgresRateLimitStore('registration'):undefined});
export const customerRecoveryRateLimit = rateLimit({windowMs:900000,limit:5,store:env.NODE_ENV==='production'||env.RATE_LIMIT_STORE==='postgres'?new PostgresRateLimitStore('recovery'):undefined});
