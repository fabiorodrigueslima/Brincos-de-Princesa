export const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function hasValidSale(variant) {
  const price = Number(variant?.price)
  const salePrice = Number(variant?.salePrice)
  return Number.isFinite(price) && Number.isFinite(salePrice) && salePrice > 0 && salePrice < price
}

export function effectivePrice(variant) {
  if (!variant) return null
  return hasValidSale(variant) ? Number(variant.salePrice) : Number(variant.price)
}

export function attributeEntries(attributes) {
  if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) return []
  return Object.entries(attributes)
    .filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value) && String(value).trim())
    .map(([name, value]) => ({
      name: name.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
      value: typeof value === 'boolean' ? (value ? 'Sim' : 'Não') : String(value),
    }))
}

export function productFacts(product, variant) {
  return [
    product.materials && { name: 'Materiais', value: product.materials },
    product.dimensions && { name: 'Medidas', value: product.dimensions },
    product.weightGrams != null && { name: 'Peso', value: `${Number(product.weightGrams).toLocaleString('pt-BR')} g` },
    product.productionDays > 0 && { name: 'Produção', value: `Até ${product.productionDays} dias` },
    ...attributeEntries(variant?.attributes),
  ].filter(Boolean)
}

export function categoryPath(category) {
  return ['brincos', 'aneis', 'colares', 'pulseiras'].includes(category?.slug) ? `/${category.slug}` : '/loja'
}
