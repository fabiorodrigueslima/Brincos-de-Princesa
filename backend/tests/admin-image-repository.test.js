import { beforeEach, describe, expect, it, vi } from 'vitest'

const query = vi.fn()
const transaction = vi.fn(async (work) => work({ query }))

vi.mock('../src/config/database.js', () => ({ query, transaction }))

const { adminRepository } = await import('../src/repositories/adminRepository.js')

describe('admin image repository', () => {
  beforeEach(() => vi.clearAllMocks())

  it('persists the public URL and provider asset id, preserving primary order', async () => {
    query
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 4 }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ ordem: 2 }] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 9, storage_key: 'brinco-de-princesa/products/asset-id' }],
      })

    const image = await adminRepository.addImage({
      productId: 4,
      alt: 'Brinco artesanal',
      mime: 'image/jpeg',
      key: 'brinco-de-princesa/products/asset-id',
      url: 'https://res.cloudinary.com/test/image/upload/asset-id.jpg',
      primary: true,
    })

    expect(image.storage_key).toBe('brinco-de-princesa/products/asset-id')
    expect(query).toHaveBeenLastCalledWith(expect.objectContaining({
      text: expect.stringContaining('INSERT INTO app.produto_imagens'),
      values: [
        4,
        'https://res.cloudinary.com/test/image/upload/asset-id.jpg',
        'Brinco artesanal',
        'image/jpeg',
        2,
        true,
        'brinco-de-princesa/products/asset-id',
      ],
    }))
  })

  it('returns the provider asset id when deleting an image', async () => {
    query.mockResolvedValue({
      rowCount: 1,
      rows: [{ storage_key: 'brinco-de-princesa/products/asset-id' }],
    })

    await expect(adminRepository.deleteImage(9)).resolves.toEqual({
      storage_key: 'brinco-de-princesa/products/asset-id',
    })
  })
})
