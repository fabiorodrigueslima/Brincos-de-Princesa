import { query } from '../config/database.js'

const CHECKOUT_ENABLED_KEY = 'checkout.enabled'

export function createSettingsRepository(dbQuery = query) {
  return {
    async isCheckoutEnabled({ lock = false } = {}) {
      const result = await dbQuery({
        text: `SELECT valor FROM app.configuracoes WHERE chave=$1${lock ? ' FOR SHARE' : ''}`,
        values: [CHECKOUT_ENABLED_KEY],
      })
      return result.rows[0]?.valor === true
    },
  }
}

export const settingsRepository = createSettingsRepository()
