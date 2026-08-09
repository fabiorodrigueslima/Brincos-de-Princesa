export const CART_STORAGE_KEY = 'brinco-de-princesa:cart'
export const MAX_CART_QUANTITY = 99

export function sanitizeCartItems(value) {
  if (!Array.isArray(value)) return []
  const quantities = new Map()
  for (const item of value) {
    if (!Number.isInteger(item?.variantId) || item.variantId < 1) continue
    if (!Number.isInteger(item?.quantity) || item.quantity < 1 || item.quantity > MAX_CART_QUANTITY) continue
    quantities.set(item.variantId, Math.min(MAX_CART_QUANTITY, (quantities.get(item.variantId) ?? 0) + item.quantity))
  }
  return [...quantities].map(([variantId, quantity]) => ({ variantId, quantity }))
}

export function readCart(storage = globalThis.localStorage) {
  try {
    return sanitizeCartItems(JSON.parse(storage.getItem(CART_STORAGE_KEY) ?? '[]'))
  } catch {
    storage?.removeItem(CART_STORAGE_KEY)
    return []
  }
}

export function cartReducer(state, action) {
  switch (action.type) {
    case 'add': {
      const quantity = Number(action.quantity)
      if (!Number.isInteger(action.variantId) || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_CART_QUANTITY) return state
      const existing = state.find((item) => item.variantId === action.variantId)
      if (!existing) return [...state, { variantId: action.variantId, quantity }]
      return state.map((item) => item.variantId === action.variantId
        ? { ...item, quantity: Math.min(MAX_CART_QUANTITY, item.quantity + quantity) }
        : item)
    }
    case 'remove': return state.filter((item) => item.variantId !== action.variantId)
    case 'update': {
      if (!Number.isInteger(action.quantity) || action.quantity < 1 || action.quantity > MAX_CART_QUANTITY) return state
      return state.map((item) => item.variantId === action.variantId ? { ...item, quantity: action.quantity } : item)
    }
    case 'clear': return []
    default: return state
  }
}
