import { timingSafeEqual } from 'node:crypto'
import { env } from '../config/env.js'
import { adminAuthService } from '../services/adminAuthService.js'
import { AppError } from '../utils/AppError.js'

export const ADMIN_COOKIE = '__Host-bdp_admin'
const parseCookies = (header = '') => Object.fromEntries(header.split(';').flatMap((part) => {
  const separator = part.indexOf('=')
  if (separator < 1) return []
  try {
    const key = decodeURIComponent(part.slice(0, separator).trim())
    const value = decodeURIComponent(part.slice(separator + 1).trim())
    return key && value ? [[key, value]] : []
  } catch {
    return []
  }
}))

export async function requireAdmin(req, _res, next) {
  try {
    const token = parseCookies(req.get('cookie'))[ADMIN_COOKIE]
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return next(new AppError(401, 'ADMIN_AUTH_REQUIRED', 'Sessão administrativa necessária.'))
    const session = await adminAuthService.authenticate(token)
    if (!session?.ativo) return next(new AppError(401, 'ADMIN_AUTH_REQUIRED', 'Sessão administrativa necessária.'))
    req.admin = session; req.adminToken = token
    return next()
  } catch (error) { return next(error) }
}

export function requireRole(...roles) {
  return (req, _res, next) => roles.includes(req.admin.papel) ? next() : next(new AppError(403, 'ADMIN_FORBIDDEN', 'Você não possui permissão para esta ação.'))
}

export function requireCsrf(req, _res, next) {
  const origin = req.get('origin')
  let allowedOrigin
  try {
    allowedOrigin = origin && new URL(origin).origin
  } catch {
    allowedOrigin = null
  }
  if (!allowedOrigin || !req.app.get('adminOrigins')?.includes(allowedOrigin)) return next(new AppError(403, 'CSRF_INVALID', 'Origem administrativa inválida.'))
  const supplied = req.get('X-CSRF-Token') ?? ''
  const suppliedHash = adminAuthService.hash(supplied)
  const expected = req.admin.csrf_secret_hash
  const valid = suppliedHash.length === expected.length && timingSafeEqual(Buffer.from(suppliedHash), Buffer.from(expected))
  return valid ? next() : next(new AppError(403, 'CSRF_INVALID', 'Token de segurança inválido.'))
}

export function adminCookieOptions() {
  return { httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: env.ADMIN_SESSION_HOURS * 60 * 60 * 1000 }
}

export function sensitiveNoStore(_req, res, next) {
  res.set('Cache-Control', 'no-store, private')
  res.set('Pragma', 'no-cache')
  next()
}
