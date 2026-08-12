import { env } from '../config/env.js'
import { AppError } from '../utils/AppError.js'

export function createPostalCodeProvider({ fetchImpl = fetch, baseUrl = env.POSTAL_CODE_PROVIDER_URL, timeoutMs = env.EXTERNAL_REQUEST_TIMEOUT_MS } = {}) {
  return {
    async lookup(postalCode) {
      try {
        const response = await fetchImpl(`${baseUrl}/${postalCode}`, { signal: AbortSignal.timeout(timeoutMs), headers: { Accept: 'application/json' } })
        if (response.status === 404) throw new AppError(404, 'POSTAL_CODE_NOT_FOUND', 'CEP não encontrado.')
        if (!response.ok) throw new AppError(503, 'POSTAL_CODE_PROVIDER_UNAVAILABLE', 'A consulta automática de CEP está indisponível. Preencha o endereço manualmente.')
        const data = await response.json()
        return { postalCode, street: data.street || '', neighborhood: data.neighborhood || '', city: data.city || '', state: data.state || '' }
      } catch (error) {
        if (error instanceof AppError) throw error
        throw new AppError(503, 'POSTAL_CODE_PROVIDER_UNAVAILABLE', 'A consulta automática de CEP está indisponível. Preencha o endereço manualmente.')
      }
    },
  }
}

export const postalCodeProvider = createPostalCodeProvider()
