import { describe, expect, it, vi } from 'vitest'
import { CART_STORAGE_KEY, cartReducer, readCart, sanitizeCartItems } from './cartState.js'

describe('cart state', () => {
  it('adds and merges the same variant', () => {
    let state = cartReducer([], { type: 'add', variantId: 10, quantity: 1 })
    state = cartReducer(state, { type: 'add', variantId: 10, quantity: 2 })
    expect(state).toEqual([{ variantId: 10, quantity: 3 }])
  })

  it('updates, removes and clears items', () => {
    const initial = [{ variantId: 10, quantity: 1 }, { variantId: 11, quantity: 2 }]
    expect(cartReducer(initial, { type: 'update', variantId: 10, quantity: 3 })[0].quantity).toBe(3)
    expect(cartReducer(initial, { type: 'remove', variantId: 10 })).toEqual([{ variantId: 11, quantity: 2 }])
    expect(cartReducer(initial, { type: 'clear' })).toEqual([])
  })

  it('rejects invalid quantities and sanitizes duplicate storage items', () => {
    const state = [{ variantId: 10, quantity: 1 }]
    for (const quantity of [0, -1, 100, NaN, Infinity, '2']) {
      expect(cartReducer(state, { type: 'update', variantId: 10, quantity })).toBe(state)
    }
    expect(sanitizeCartItems([{ variantId: 10, quantity: 1 }, { variantId: 10, quantity: 2 }, { variantId: 'x', quantity: -1 }]))
      .toEqual([{ variantId: 10, quantity: 3 }])
  })

  it('recovers from corrupted localStorage', () => {
    const storage = { getItem: vi.fn(() => '{broken'), removeItem: vi.fn() }
    expect(readCart(storage)).toEqual([])
    expect(storage.removeItem).toHaveBeenCalledWith(CART_STORAGE_KEY)
  })
})
