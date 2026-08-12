import cors from 'cors'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import { env } from '../config/env.js'

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'same-site' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  strictTransportSecurity: env.NODE_ENV === 'production' ? undefined : false,
})

export const corsPolicy = cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin || env.frontendOrigins.includes(origin)) return callback(null, true)
    return callback(new Error('Origem não autorizada'))
  },
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-Request-Id', 'X-Order-Token', 'Idempotency-Key'],
  maxAge: 600,
})

export const publicRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  // Health probes must remain observable and authenticated provider webhooks
  // must not be dropped by a generic client-IP quota.
  skip: (req) => req.path.startsWith('/health/') || req.path.startsWith('/webhooks/'),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Muitas solicitações. Tente novamente mais tarde.' } },
})

export const checkoutRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Muitas consultas de checkout. Aguarde e tente novamente.' } },
})

export const orderMutationRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 15, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: { code: 'RATE_LIMITED', message: 'Muitas tentativas. Aguarde antes de tentar novamente.' } } })
export const orderStatusRateLimit = rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: { code: 'RATE_LIMITED', message: 'Muitas consultas. Aguarde antes de tentar novamente.' } } })
export const adminLoginRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: { code: 'RATE_LIMITED', message: 'Muitas tentativas de acesso. Aguarde e tente novamente.' } } })
