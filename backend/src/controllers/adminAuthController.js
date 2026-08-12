import { env } from '../config/env.js'
import { ADMIN_COOKIE, adminCookieOptions } from '../middlewares/adminSecurity.js'
import { adminAuthService } from '../services/adminAuthService.js'

export async function login(req, res) { const result = await adminAuthService.login({ ...req.validated.body, requestId: req.requestId, ip: req.ip, userAgent: req.get('user-agent') }); res.cookie(ADMIN_COOKIE, result.token, { ...adminCookieOptions(), secure: env.NODE_ENV === 'production' }); res.json({ data: { user: result.user, csrfToken: result.csrf } }) }
export async function me(req, res) { res.json({ data: { user: { id: Number(req.admin.admin_id), name: req.admin.nome, email: req.admin.email, role: req.admin.papel }, csrfToken: await adminAuthService.refreshCsrf(req.admin) } }) }
export async function logout(req, res) { await adminAuthService.logout(req.adminToken, req.admin, req.requestId); res.clearCookie(ADMIN_COOKIE, { ...adminCookieOptions(), secure: env.NODE_ENV === 'production' }); res.status(204).end() }
