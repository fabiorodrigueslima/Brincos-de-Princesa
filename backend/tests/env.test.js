import { afterEach, describe, expect, it, vi } from 'vitest'

describe('environment configuration', () => {
  afterEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  it('parses the default DB_SSL value as a boolean false', async () => {
    const { env } = await import('../src/config/env.js')
    expect(env.DB_SSL).toBe(false)
  })

  it('rejects disabled payment provider in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@localhost:5432/brinco_de_princesa')
    vi.stubEnv('FRONTEND_ORIGINS', 'https://shop.example.com')
    vi.stubEnv('PAYMENT_PROVIDER', 'disabled')
    vi.stubEnv('SHIPPING_PROVIDER', 'superfrete')
    vi.stubEnv('SUPERFRETE_TOKEN', 'test-token')
    vi.stubEnv('SUPERFRETE_ORIGIN_CEP', '01001000')
    vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'test-cloud')
    vi.stubEnv('CLOUDINARY_API_KEY', 'test-key')
    vi.stubEnv('CLOUDINARY_API_SECRET', 'test-secret')
    vi.stubEnv('PUBLIC_BACKEND_URL', 'https://api.example.com')
    vi.stubEnv('PUBLIC_FRONTEND_URL', 'https://shop.example.com')

    await expect(import('../src/config/env.js')).rejects.toThrow(/PAYMENT_PROVIDER/)
  })

  it('rejects disabled shipping provider in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@localhost:5432/brinco_de_princesa')
    vi.stubEnv('FRONTEND_ORIGINS', 'https://shop.example.com')
    vi.stubEnv('PAYMENT_PROVIDER', 'mercado-pago')
    vi.stubEnv('MERCADO_PAGO_ACCESS_TOKEN', 'TEST-token')
    vi.stubEnv('MERCADO_PAGO_WEBHOOK_SECRET', '1234567890abcdef')
    vi.stubEnv('SHIPPING_PROVIDER', 'disabled')
    vi.stubEnv('PUBLIC_BACKEND_URL', 'https://api.example.com')
    vi.stubEnv('PUBLIC_FRONTEND_URL', 'https://shop.example.com')

    await expect(import('../src/config/env.js')).rejects.toThrow(/SHIPPING_PROVIDER/)
  })

  function stubProductionStorage(storageProvider = 'cloudinary') {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@localhost:5432/brinco_de_princesa')
    vi.stubEnv('FRONTEND_ORIGINS', 'https://shop.example.com')
    vi.stubEnv('PAYMENT_PROVIDER', 'mercado-pago')
    vi.stubEnv('MERCADO_PAGO_ACCESS_TOKEN', 'test-token')
    vi.stubEnv('MERCADO_PAGO_WEBHOOK_SECRET', '1234567890abcdef')
    vi.stubEnv('SHIPPING_PROVIDER', 'superfrete')
    vi.stubEnv('SUPERFRETE_TOKEN', 'test-token')
    vi.stubEnv('SUPERFRETE_ORIGIN_CEP', '01001000')
    vi.stubEnv('PUBLIC_BACKEND_URL', 'https://api.example.com')
    vi.stubEnv('PUBLIC_FRONTEND_URL', 'https://shop.example.com')
    vi.stubEnv('STORAGE_PROVIDER', storageProvider)
    delete process.env.STORAGE_HTTP_URL
    delete process.env.STORAGE_HTTP_TOKEN
    delete process.env.STORAGE_PUBLIC_URL
    vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'test-cloud')
    vi.stubEnv('CLOUDINARY_API_KEY', 'test-key')
    vi.stubEnv('CLOUDINARY_API_SECRET', 'test-secret')
  }

  it.each([
    ['disabled', 'disabled'],
    ['local', 'local'],
  ])('rejects %s storage in production', async (_label, storageProvider) => {
    stubProductionStorage(storageProvider)

    await expect(import('../src/config/env.js')).rejects.toThrow(/STORAGE_PROVIDER/)
  })

  it('rejects an invalid storage provider', async () => {
    stubProductionStorage('invalid')

    await expect(import('../src/config/env.js')).rejects.toThrow(/STORAGE_PROVIDER/)
  })

  it.each([
    ['cloud name', 'CLOUDINARY_CLOUD_NAME'],
    ['API key', 'CLOUDINARY_API_KEY'],
    ['API secret', 'CLOUDINARY_API_SECRET'],
  ])('rejects Cloudinary storage without %s', async (_label, missingField) => {
    stubProductionStorage()
    delete process.env[missingField]

    await expect(import('../src/config/env.js')).rejects.toThrow(/CLOUDINARY_/)
  })

  it('accepts complete Cloudinary storage in production', async () => {
    stubProductionStorage()

    const { env } = await import('../src/config/env.js')

    expect(env.STORAGE_PROVIDER).toBe('cloudinary')
  })

  it('accepts local storage in development', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('STORAGE_PROVIDER', 'local')

    const { env } = await import('../src/config/env.js')

    expect(env.STORAGE_PROVIDER).toBe('local')
  })

  it('keeps disabled storage available in test', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('STORAGE_PROVIDER', 'disabled')

    const { env } = await import('../src/config/env.js')

    expect(env.STORAGE_PROVIDER).toBe('disabled')
  })
})
