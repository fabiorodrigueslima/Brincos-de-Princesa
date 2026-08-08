import { describe, expect, it } from 'vitest'
import { env } from '../src/config/env.js'

describe('environment configuration', () => {
  it('parses the default DB_SSL value as a boolean false', () => {
    expect(env.DB_SSL).toBe(false)
  })
})
