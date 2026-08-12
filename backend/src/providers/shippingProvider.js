import { AppError } from '../utils/AppError.js'

export const shippingProvider = {
  async quote() {
    throw new AppError(503, 'SHIPPING_NOT_CONFIGURED', 'A cotação de frete depende da configuração da transportadora.')
  },
}
