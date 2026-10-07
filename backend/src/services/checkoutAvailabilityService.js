import { settingsRepository } from '../repositories/settingsRepository.js'
import { AppError } from '../utils/AppError.js'

export function createCheckoutAvailabilityService(repository = settingsRepository) {
  return {
    async assertEnabled(options) {
      if (!await repository.isCheckoutEnabled(options)) {
        throw new AppError(503, 'CHECKOUT_DISABLED', 'Novas compras estão temporariamente indisponíveis. Tente novamente mais tarde.')
      }
    },
  }
}

export const checkoutAvailabilityService = createCheckoutAvailabilityService()
