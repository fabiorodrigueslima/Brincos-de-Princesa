import { cartService } from './cartService.js'
import { shippingProvider } from '../providers/shippingProvider.js'
import { AppError } from '../utils/AppError.js'

const toCents = (value) => Math.round(Number(value) * 100)
const toDecimal = (value) => `${Math.floor(value / 100)}.${String(value % 100).padStart(2, '0')}`

export function createCheckoutService({ cart = cartService, shipping = shippingProvider } = {}) {
  return {
    async quote(input) {
      const cartResult = await cart.validate(input.items)
      if (cartResult.items.some((item) => !item.available)) {
        throw new AppError(409, 'CART_CHANGED', 'O estoque ou a disponibilidade do carrinho mudou.', cartResult.items.filter((item) => !item.available))
      }
      const options = await shipping.quote({
        postalCode: input.address.postalCode,
        state: input.address.state,
        subtotal: cartResult.subtotal,
        items: cartResult.items.map((item) => ({ variantId: item.variantId, quantity: item.quantity, weightGrams: item.weightGrams ?? null, dimensionsCm: item.dimensionsCm ?? null })),
      })
      const normalized = options.map((option) => ({ id: String(option.id), service: String(option.service), carrier: option.carrier ? String(option.carrier) : null, price: toDecimal(toCents(option.price)), estimatedDays: Number.isInteger(option.estimatedDays) ? option.estimatedDays : null }))
      const selected = input.shippingOptionId ? normalized.find((option) => option.id === input.shippingOptionId) : null
      if (input.shippingOptionId && !selected) throw new AppError(400, 'SHIPPING_OPTION_INVALID', 'A opção de entrega selecionada não é válida.')
      const subtotalCents = toCents(cartResult.subtotal)
      const shippingCents = selected ? toCents(selected.price) : 0
      return { items: cartResult.items, subtotal: toDecimal(subtotalCents), shippingOptions: normalized, selectedShipping: selected, shipping: selected?.price ?? null, total: selected ? toDecimal(subtotalCents + shippingCents) : null }
    },
  }
}

export const checkoutService = createCheckoutService()
