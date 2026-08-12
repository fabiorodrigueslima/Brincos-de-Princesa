import { AppError } from '../utils/AppError.js'

export const paymentProvider = {
  name: 'disabled',
  async createPayment() { throw new AppError(503, 'PAYMENT_NOT_CONFIGURED', 'Nenhum gateway de pagamento está configurado.') },
  async getPayment() { throw new AppError(503, 'PAYMENT_NOT_CONFIGURED', 'Nenhum gateway de pagamento está configurado.') },
  async verifyWebhook() { throw new AppError(404, 'PAYMENT_PROVIDER_NOT_FOUND', 'Provedor de pagamento não configurado.') },
}
