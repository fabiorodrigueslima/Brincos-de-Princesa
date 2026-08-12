import pg from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const { Client } = pg
const testDatabaseUrl = process.env.TEST_DATABASE_URL
const testAdminDatabaseUrl = process.env.TEST_DATABASE_ADMIN_URL

if (!testDatabaseUrl || !testAdminDatabaseUrl) {
  throw new Error('TEST_DATABASE_URL e TEST_DATABASE_ADMIN_URL são obrigatórias para a integração PostgreSQL')
}

const databaseName = new URL(testDatabaseUrl).pathname.slice(1)
if (!databaseName.endsWith('_test')) {
  throw new Error('A integração PostgreSQL só pode usar um banco com sufixo _test')
}

const fixtureId = `${process.pid}-${Date.now()}`
const productSlug = `brinco-floral-${fixtureId}`
const collectionSlug = `colecao-${fixtureId}`
let adminClient
let catalogService
let closeDatabase
let productId
let collectionId
let archivedProductId
let saleVariantId

describe('catalog with isolated PostgreSQL', () => {
  beforeAll(async () => {
    adminClient = new Client({ connectionString: testAdminDatabaseUrl })
    await adminClient.connect()

    const current = await adminClient.query('SELECT current_database() AS database')
    if (current.rows[0].database !== databaseName || !databaseName.endsWith('_test')) {
      throw new Error('Proteção de banco de teste recusou preparar a fixture')
    }

    const category = await adminClient.query(
      'SELECT id FROM app.categorias WHERE slug = $1',
      ['brincos'],
    )

    const collection = await adminClient.query({
      text: `INSERT INTO app.colecoes (nome, slug, descricao, ativa, destaque, publicada_em)
             VALUES ($1, $2, $3, TRUE, TRUE, now())
             RETURNING id`,
      values: ['Coleção de teste isolado', collectionSlug, 'Fixture criada e removida pela própria suíte.'],
    })
    collectionId = collection.rows[0].id

    const product = await adminClient.query({
      text: `INSERT INTO app.produtos (
               categoria_id, nome, slug, descricao, materiais, medidas, cuidados,
               prazo_producao_dias, status, destaque, novidade, publicado_em
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, 3, 'ACTIVE', TRUE, TRUE, now())
             RETURNING id`,
      values: [
        category.rows[0].id,
        'Brinco Floral de Teste',
        productSlug,
        'Produto temporário para validar o catálogo.',
        'Resina e metal',
        '4 cm',
        'Evitar contato com produtos químicos.',
      ],
    })
    productId = product.rows[0].id

    const archivedProduct = await adminClient.query({
      text: `INSERT INTO app.produtos (categoria_id, nome, slug, descricao, status)
             VALUES ($1, $2, $3, $4, 'ARCHIVED')
             RETURNING id`,
      values: [
        category.rows[0].id,
        'Produto Arquivado de Teste',
        `produto-arquivado-${fixtureId}`,
        'Este item não pode aparecer no catálogo público.',
      ],
    })
    archivedProductId = archivedProduct.rows[0].id

    await adminClient.query({
      text: `INSERT INTO app.produto_variantes (produto_id, sku, nome, preco, estoque)
             VALUES ($1, $2, 'Oculta', 49.90, 4)`,
      values: [archivedProductId, `TEST-ARCHIVED-${fixtureId}`],
    })

    await adminClient.query({
      text: `INSERT INTO app.produto_variantes
               (produto_id, sku, nome, atributos, preco, preco_promocional, estoque)
             VALUES
               ($1, $2, 'Vinho', '{"cor":"vinho"}', 129.90, 109.90, 5),
               ($1, $3, 'Marfim', '{"cor":"marfim"}', 119.90, NULL, 0)`,
      values: [productId, `TEST-VINHO-${fixtureId}`, `TEST-MARFIM-${fixtureId}`],
    })
    const saleVariant = await adminClient.query('SELECT id FROM app.produto_variantes WHERE sku = $1', [`TEST-VINHO-${fixtureId}`])
    saleVariantId = Number(saleVariant.rows[0].id)
    await adminClient.query(
      `INSERT INTO app.produto_imagens (produto_id, url, alt_text, principal, ordem)
       VALUES ($1, '/images/hero-artesanal.webp', 'Brinco floral de teste', TRUE, 0)`,
      [productId],
    )
    await adminClient.query(
      'INSERT INTO app.produto_colecoes (produto_id, colecao_id) VALUES ($1, $2)',
      [productId, collectionId],
    )

    ;({ catalogService } = await import('../src/services/catalogService.js'))
    ;({ closeDatabase } = await import('../src/config/database.js'))
  })

  afterAll(async () => {
    if (closeDatabase) await closeDatabase()

    if (adminClient) {
      try {
        if (productId) {
          await adminClient.query('DELETE FROM app.produto_colecoes WHERE produto_id = $1', [productId])
          await adminClient.query('DELETE FROM app.produto_imagens WHERE produto_id = $1', [productId])
          await adminClient.query('DELETE FROM app.produto_variantes WHERE produto_id = $1', [productId])
          await adminClient.query('DELETE FROM app.produtos WHERE id = $1', [productId])
        }
        if (archivedProductId) {
          await adminClient.query('DELETE FROM app.produto_variantes WHERE produto_id = $1', [archivedProductId])
          await adminClient.query('DELETE FROM app.produtos WHERE id = $1', [archivedProductId])
        }
        if (collectionId) await adminClient.query('DELETE FROM app.colecoes WHERE id = $1', [collectionId])
      } finally {
        await adminClient.end()
      }
    }
  })

  it('lists a seeded product with filters and server-side price', async () => {
    const result = await catalogService.listProducts({
      q: 'Floral', category: 'brincos', collection: collectionSlug,
      sort: 'price_asc', page: 1, limit: 12,
    })

    expect(result.pagination.total).toBe(1)
    expect(result.items[0]).toMatchObject({
      slug: productSlug,
      price: '109.90',
      originalPrice: '129.90',
      inStock: true,
    })
  })

  it('filters only products with a valid promotional variant', async () => {
    const result = await catalogService.listProducts({
      promotions: true, sort: 'newest', page: 1, limit: 12,
    })
    expect(result.items.map((item) => item.slug)).toContain(productSlug)
    expect(result.items.find((item) => item.slug === productSlug)).toMatchObject({
      price: '109.90', originalPrice: '129.90',
    })
  })

  it('combines search, category, collection and promotion filters', async () => {
    const result = await catalogService.listProducts({
      q: 'Floral', category: 'brincos', collection: collectionSlug,
      promotions: true, sort: 'newest', page: 1, limit: 1,
    })
    expect(result.pagination).toMatchObject({ total: 1, totalPages: 1 })
    expect(result.items[0].slug).toBe(productSlug)
  })

  it('uses effective promotional price for descending and ascending sorting', async () => {
    const ascending = await catalogService.listProducts({ sort: 'price_asc', page: 1, limit: 48 })
    const descending = await catalogService.listProducts({ sort: 'price_desc', page: 1, limit: 48 })
    expect(Number(ascending.items[0].price)).toBeLessThanOrEqual(Number(ascending.items.at(-1).price))
    expect(Number(descending.items[0].price)).toBeGreaterThanOrEqual(Number(descending.items.at(-1).price))
  })

  it('returns variants, images and collections for product detail', async () => {
    const product = await catalogService.getProduct(productSlug)
    expect(product.variants).toHaveLength(2)
    expect(product.id).toEqual(expect.any(Number))
    expect(product.variants[0].id).toEqual(expect.any(Number))
    expect(product.images[0].id).toEqual(expect.any(Number))
    expect(product.images[0].primary).toBe(true)
    expect(product.variants[0]).toHaveProperty('availableStock')
    expect(product.collections[0].slug).toBe(collectionSlug)
  })

  it('lists active categories and collections with public product counts', async () => {
    const categories = await catalogService.listCategories()
    const collections = await catalogService.listCollections()

    expect(categories.find((category) => category.slug === 'brincos')).toMatchObject({ productCount: 1 })
    expect(collections.find((collection) => collection.slug === collectionSlug)).toMatchObject({ productCount: 1 })
  })

  it('returns a controlled error for an unknown collection slug', async () => {
    await expect(catalogService.getCollection(`inexistente-${fixtureId}`)).rejects.toMatchObject({
      status: 404, code: 'COLLECTION_NOT_FOUND',
    })
  })

  it('does not expose archived products in listing or detail', async () => {
    const archivedSlug = `produto-arquivado-${fixtureId}`
    const list = await catalogService.listProducts({
      q: 'Arquivado', sort: 'newest', page: 1, limit: 12,
    })

    expect(list.pagination.total).toBe(0)
    await expect(catalogService.getProduct(archivedSlug)).rejects.toMatchObject({
      status: 404,
      code: 'PRODUCT_NOT_FOUND',
    })
  })

  it('revalidates changed price and ignores a forged browser price', async () => {
    const { cartService } = await import('../src/services/cartService.js')
    const before = await cartService.validate([{ variantId: saleVariantId, quantity: 2, price: 0.01 }])
    expect(before.items[0]).toMatchObject({ unitPrice: '109.90', subtotal: '219.80', available: true })

    await adminClient.query('UPDATE app.produto_variantes SET preco_promocional = 119.90 WHERE id = $1', [saleVariantId])
    const after = await cartService.validate([{ variantId: saleVariantId, quantity: 2, price: 0.01 }])
    expect(after.items[0]).toMatchObject({ unitPrice: '119.90', subtotal: '239.80', availableStock: 5 })
  })
})
