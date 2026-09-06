import { beforeEach, describe, expect, it, vi } from 'vitest'

const put = vi.fn()
const remove = vi.fn()
const addImage = vi.fn()
const deleteImage = vi.fn()

vi.mock('../src/providers/storageProvider.js', () => ({
  storageProvider: { put, delete: remove },
}))
vi.mock('../src/repositories/adminRepository.js', () => ({
  adminRepository: { addImage, deleteImage },
}))

const { imageService } = await import('../src/services/imageService.js')

describe('image service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    put.mockReset()
    remove.mockReset()
    addImage.mockReset()
    deleteImage.mockReset()
  })

  it('rejects content whose bytes do not match the declared image type', async () => {
    await expect(imageService.upload({
      productId: 1,
      alt: 'Imagem do produto',
      mime: 'image/png',
      buffer: Buffer.from('not a png'),
      primary: false,
    })).rejects.toMatchObject({ status: 400, code: 'IMAGE_INVALID' })
    expect(put).not.toHaveBeenCalled()
  })

  it('removes the stored object when database persistence fails', async () => {
    put.mockResolvedValue({ url: 'https://cdn.example/image.png', providerAssetId: 'products/asset-id' })
    addImage.mockRejectedValue(new Error('database unavailable'))
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

    await expect(imageService.upload({
      productId: 1,
      alt: 'Imagem do produto',
      mime: 'image/png',
      buffer: png,
      primary: true,
    })).rejects.toThrow('database unavailable')

    expect(remove).toHaveBeenCalledOnce()
    expect(remove).toHaveBeenCalledWith('products/asset-id')
  })

  it('preserves the database error when Cloudinary cleanup also fails', async () => {
    const databaseError = new Error('database unavailable')
    put.mockResolvedValue({ url: 'https://cdn.example/image.png', providerAssetId: 'products/asset-id' })
    addImage.mockRejectedValue(databaseError)
    remove.mockRejectedValue(new Error('cloudinary unavailable'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

    await expect(imageService.upload({
      productId: 1,
      alt: 'Imagem do produto',
      mime: 'image/png',
      buffer: png,
      primary: true,
    })).rejects.toBe(databaseError)

    expect(remove).toHaveBeenCalledWith('products/asset-id')
    expect(errorSpy).toHaveBeenCalledWith(expect.objectContaining({
      event: 'IMAGE_UPLOAD_COMPENSATION_FAILED',
      providerAssetId: 'products/asset-id',
    }))
  })

  it('removes the stored object associated with a deleted database row', async () => {
    deleteImage.mockResolvedValue({ storage_key: 'catalog/image.webp' })

    await imageService.delete(9)

    expect(deleteImage).toHaveBeenCalledWith(9)
    expect(remove).toHaveBeenCalledWith('catalog/image.webp')
  })
})
