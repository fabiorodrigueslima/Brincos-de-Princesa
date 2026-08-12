import { createHash, randomBytes } from 'node:crypto'
import { env } from '../config/env.js'
import { adminAuthRepository } from '../repositories/adminAuthRepository.js'
import { verifyPassword } from '../security/password.js'
import { AppError } from '../utils/AppError.js'

const hash = (value) => createHash('sha256').update(value).digest('hex')
const randomToken = () => randomBytes(32).toString('base64url')
const fingerprint = (value = '') => hash(value).slice(0, 64)

export function createAdminAuthService(repository = adminAuthRepository) {
  return {
    async login({ email, password, requestId, ip, userAgent }) {
      const admin = await repository.findByEmail(email)
      const valid = admin && admin.ativo && (!admin.bloqueado_ate || new Date(admin.bloqueado_ate) <= new Date()) && await verifyPassword(password, admin.password_hash)
      if (!valid) {
        if (admin) await repository.recordFailure(admin.id)
        await repository.audit({ adminId: admin?.id, action: 'ADMIN_LOGIN', result: 'DENIED', requestId })
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Credenciais inválidas.')
      }
      const token = randomToken(); const csrf = randomToken()
      await repository.createSession(admin.id, hash(token), hash(csrf), fingerprint(ip), fingerprint(userAgent), env.ADMIN_SESSION_HOURS)
      await repository.recordSuccess(admin.id)
      await repository.audit({ adminId: admin.id, action: 'ADMIN_LOGIN', requestId })
      return { token, csrf, user: { id: Number(admin.id), name: admin.nome, email: admin.email, role: admin.papel } }
    },
    async authenticate(token) { if (!token) return null; return repository.findSession(hash(token)) },
    async refreshCsrf(session) { const csrf=randomToken();await repository.rotateCsrf(session.id,hash(csrf));return csrf },
    async logout(token, session, requestId) { if (token) await repository.revoke(hash(token)); if (session) await repository.audit({ adminId: session.admin_id, action: 'ADMIN_LOGOUT', requestId }) },
    hash,
  }
}
export const adminAuthService = createAdminAuthService()
