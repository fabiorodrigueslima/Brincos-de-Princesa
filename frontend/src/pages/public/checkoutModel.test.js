import { describe, expect, it } from 'vitest'
import { formatPostalCode, normalizePostalCode, validateAddress, validateCustomer } from './checkoutModel.js'

describe('checkout form model', () => {
  it('normalizes and formats Brazilian postal codes', () => { expect(normalizePostalCode('72.000-000x')).toBe('72000000'); expect(formatPostalCode('72000000')).toBe('72000-000') })
  it('validates identification without collecting CPF', () => { expect(validateCustomer({ name: '', email: 'x', phone: '1' })).toEqual(expect.objectContaining({ name: expect.any(String), email: expect.any(String), phone: expect.any(String) })); expect(validateCustomer({ name: 'Maria Silva', email: 'maria@example.com', phone: '61999999999' })).toEqual({}) })
  it('accepts S/N and requires complete delivery fields', () => { expect(validateAddress({ postalCode: '72000000', street: 'Rua A', number: 'S/N', complement: '', neighborhood: 'Centro', city: 'Brasília', state: 'DF' })).toEqual({}); expect(validateAddress({ postalCode: 'x', street: '', number: '', neighborhood: '', city: '', state: 'D' })).toHaveProperty('postalCode') })
})
