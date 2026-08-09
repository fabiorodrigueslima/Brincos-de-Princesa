import { cartRepository } from '../repositories/cartRepository.js'

function decimalToCents(value) {
  const [whole, fraction = ''] = String(value).split('.')
  return (Number(whole) * 100) + Number(fraction.padEnd(2, '0').slice(0, 2))
}

function centsToDecimal(cents) {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`
}

export function createCartService(repository = cartRepository) {
  return {
    async validate(items) {
      const rows = await repository.findVariantsByIds([...new Set(items.map((item) => item.variantId))])
      const variants = new Map(rows.map((row) => [Number(row.variante_id), row]))
      let subtotalCents = 0

      const validatedItems = items.map(({ variantId, quantity }) => {
        const row = variants.get(variantId)
        if (!row) return { variantId, quantity, available: false, reason: 'VARIANT_NOT_FOUND' }

        const active = row.ativa && row.produto_status === 'ACTIVE'
        const availableStock = row.estoque_disponivel
        const available = active && availableStock >= quantity && availableStock > 0
        const unitPriceCents = decimalToCents(row.preco_promocional ?? row.preco)
        const itemSubtotalCents = unitPriceCents * quantity
        if (active) subtotalCents += itemSubtotalCents

        return {
          variantId,
          productId: Number(row.produto_id),
          productSlug: row.produto_slug,
          productName: row.produto_nome,
          variantName: row.variante_nome,
          sku: row.sku,
          image: row.imagem_url ? { url: row.imagem_url, alt: row.imagem_alt } : null,
          unitPrice: centsToDecimal(unitPriceCents),
          quantity,
          availableStock,
          subtotal: centsToDecimal(itemSubtotalCents),
          available,
          reason: !active ? 'INACTIVE' : availableStock === 0 ? 'OUT_OF_STOCK' : availableStock < quantity ? 'INSUFFICIENT_STOCK' : null,
        }
      })

      return { items: validatedItems, subtotal: centsToDecimal(subtotalCents) }
    },
  }
}

export const cartService = createCartService()
