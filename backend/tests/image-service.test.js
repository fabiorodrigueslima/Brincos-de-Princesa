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
  beforeEach(() => vi.clearAllMocks())

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
    put.mockResolvedValue({ url: 'https://cdn.example/image.png' })
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
    expect(remove).toHaveBeenCalledWith(expect.stringMatching(/^[a-f0-9]{48}\.png$/))
  })

  it('removes the stored object associated with a deleted database row', async () => {
    deleteImage.mockResolvedValue({ storage_key: 'catalog/image.webp' })

    await imageService.delete(9)

    expect(deleteImage).toHaveBeenCalledWith(9)
    expect(remove).toHaveBeenCalledWith('catalog/image.webp')
  })
})
