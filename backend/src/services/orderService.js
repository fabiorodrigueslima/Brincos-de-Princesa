import { createHash, randomBytes } from 'node:crypto'
import { checkoutService } from './checkoutService.js'
import { orderRepository } from '../repositories/orderRepository.js'
import { AppError } from '../utils/AppError.js'

const hash = (value) => createHash('sha256').update(value).digest('hex')
const canonical = (value) => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]))
    : value
const stable = (value) => JSON.stringify(canonical(value))

export function createOrderService({ checkout = checkoutService, repository = orderRepository } = {}) {
  return {
    async create(input, idempotencyKey) {
      if (!idempotencyKey || idempotencyKey.length < 16 || idempotencyKey.length > 128) throw new AppError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Envie uma chave de idempotência válida.')
      const quote = await checkout.quote(input)
      if (!quote.selectedShipping || quote.total == null) throw new AppError(409, 'FINAL_QUOTE_REQUIRED', 'Uma cotação real de entrega precisa ser selecionada.')
      const accessToken = randomBytes(32).toString('base64url')
      return repository.create({ ...input, quote, keyHash: hash(idempotencyKey), requestHash: hash(stable(input)), publicCode: `BP-${randomBytes(8).toString('hex').toUpperCase()}`, accessToken, accessTokenHash: hash(accessToken) })
    },
    async get(code, accessToken) {
      if (!accessToken) throw new AppError(401, 'ORDER_TOKEN_REQUIRED', 'Token de acesso ao pedido obrigatório.')
      const order = await repository.findPublic(code, hash(accessToken))
      if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Pedido não encontrado.')
      return order
    },
  }
}

export const orderService = createOrderService()
