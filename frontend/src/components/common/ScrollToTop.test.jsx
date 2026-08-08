import { describe, expect, it, vi } from 'vitest'
import { scrollViewportToTop } from './scrollViewportToTop.js'

describe('scrollViewportToTop', () => {
  it('scrolls without returning the browser result to React', () => {
    const scrollTo = vi.fn(() => Promise.resolve())

    const result = scrollViewportToTop({ scrollTo })

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' })
    expect(result).toBeUndefined()
  })
})
