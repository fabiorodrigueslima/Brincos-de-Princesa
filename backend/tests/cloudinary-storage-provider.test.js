import { createHash } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCloudinaryStorageProvider } from '../src/providers/storageProvider.js'

const config = {
  CLOUDINARY_CLOUD_NAME: 'test-cloud',
  CLOUDINARY_API_KEY: 'test-key',
  CLOUDINARY_API_SECRET: 'test-secret',
  CLOUDINARY_FOLDER: 'brinco-de-princesa/products',
  EXTERNAL_REQUEST_TIMEOUT_MS: 1000,
}

const signature = (value) => createHash('sha1').update(`${value}test-secret`).digest('hex')

describe('Cloudinary storage provider', () => {
  afterEach(() => vi.restoreAllMocks())

  it('uploads an image with a signed server-side multipart request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        secure_url: 'https://res.cloudinary.com/test/image/upload/v1/asset-id.jpg',
        public_id: 'brinco-de-princesa/products/asset-id',
      }), { status: 200 }),
    )
    const provider = createCloudinaryStorageProvider({
      config,
      fetchImpl: fetchMock,
      now: () => 1700000000,
      random: () => 'asset-id',
    })

    const result = await provider.put({
      buffer: Buffer.from([255, 216, 255]),
      mime: 'image/jpeg',
    })
    const [, request] = fetchMock.mock.calls[0]

    expect(result).toEqual({
      url: 'https://res.cloudinary.com/test/image/upload/v1/asset-id.jpg',
      providerAssetId: 'brinco-de-princesa/products/asset-id',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.cloudinary.com/v1_1/test-cloud/image/upload',
      expect.objectContaining({ method: 'POST', body: expect.any(FormData) }),
    )
    expect(request.body.get('api_key')).toBe('test-key')
    expect(request.body.get('public_id')).toBe('asset-id')
    expect(request.body.get('folder')).toBe('brinco-de-princesa/products')
    expect(request.body.get('timestamp')).toBe('1700000000')
    expect(request.body.get('signature')).toBe(
      signature('folder=brinco-de-princesa/products&public_id=asset-id&timestamp=1700000000'),
    )
  })

  it('deletes by public_id and invalidates the CDN asset', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ result: 'ok' }), { status: 200 }),
    )
    const provider = createCloudinaryStorageProvider({
      config,
      fetchImpl: fetchMock,
      now: () => 1700000000,
    })

    await provider.delete('brinco-de-princesa/products/asset-id')
    const [, request] = fetchMock.mock.calls[0]

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.cloudinary.com/v1_1/test-cloud/image/destroy',
      expect.objectContaining({ method: 'POST', body: expect.any(FormData) }),
    )
    expect(request.body.get('public_id')).toBe('brinco-de-princesa/products/asset-id')
    expect(request.body.get('invalidate')).toBe('true')
  })

  it('maps Cloudinary failures to a provider error', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'provider failure' } }), { status: 500 }),
    )
    const provider = createCloudinaryStorageProvider({ config, fetchImpl: fetchMock })

    await expect(provider.put({
      buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      mime: 'image/png',
    })).rejects.toMatchObject({ status: 502, code: 'STORAGE_PROVIDER_ERROR' })
  })
})
