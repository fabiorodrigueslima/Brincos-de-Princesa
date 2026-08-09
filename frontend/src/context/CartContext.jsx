import { useEffect, useMemo, useReducer } from 'react'
import { CART_STORAGE_KEY, cartReducer, readCart } from './cartState.js'
import { CartContext } from './cartContextValue.js'

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(cartReducer, undefined, () => readCart())

  useEffect(() => {
    try { localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items)) } catch { /* Storage indisponível não impede a compra atual. */ }
  }, [items])

  const value = useMemo(() => ({
    items,
    addItem: (variantId, quantity = 1) => dispatch({ type: 'add', variantId, quantity }),
    removeItem: (variantId) => dispatch({ type: 'remove', variantId }),
    updateQuantity: (variantId, quantity) => dispatch({ type: 'update', variantId, quantity }),
    clearCart: () => dispatch({ type: 'clear' }),
    getItemCount: () => items.reduce((total, item) => total + item.quantity, 0),
  }), [items])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
