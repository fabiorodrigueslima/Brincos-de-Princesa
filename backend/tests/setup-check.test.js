import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const backendRoot = fileURLToPath(new URL('..', import.meta.url))
const setupCheck = fileURLToPath(new URL('../src/scripts/setupCheck.js', import.meta.url))

function runSetupCheck(storageProvider, storageConfig = {}) {
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/brinco_de_princesa',
    FRONTEND_ORIGINS: 'https://shop.example.com',
    PUBLIC_BACKEND_URL: 'https://api.example.com',
    PUBLIC_FRONTEND_URL: 'https://shop.example.com',
    PAYMENT_PROVIDER: 'mercado-pago',
    MERCADO_PAGO_ACCESS_TOKEN: 'test-token',
    MERCADO_PAGO_WEBHOOK_SECRET: '1234567890abcdef',
    SHIPPING_PROVIDER: 'superfrete',
    SUPERFRETE_TOKEN: 'test-token',
    SUPERFRETE_ORIGIN_CEP: '01001000',
    CLOUDINARY_CLOUD_NAME: 'test-cloud',
    CLOUDINARY_API_KEY: 'test-key',
    CLOUDINARY_API_SECRET: 'test-secret',
    STORAGE_PROVIDER: storageProvider,
    ...storageConfig,
  }
  return spawnSync(process.execPath, [setupCheck], {
    cwd: backendRoot,
    env,
    encoding: 'utf8',
  })
}

describe('production setup check', () => {
  it('passes only with complete Cloudinary storage configuration', () => {
    const result = runSetupCheck('cloudinary')

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('Storage provider')
  })

  it('fails before accepting the disabled storage configuration', () => {
    const result = runSetupCheck('disabled')

    expect(result.status).not.toBe(0)
  })
})
