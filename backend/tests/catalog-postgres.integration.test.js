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

    await adminClient.query({
      text: `INSERT INTO app.produto_variantes
               (produto_id, sku, nome, atributos, preco, preco_promocional, estoque)
             VALUES
               ($1, $2, 'Vinho', '{"cor":"vinho"}', 129.90, 109.90, 5),
               ($1, $3, 'Marfim', '{"cor":"marfim"}', 119.90, NULL, 0)`,
      values: [productId, `TEST-VINHO-${fixtureId}`, `TEST-MARFIM-${fixtureId}`],
    })
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

  it('returns variants, images and collections for product detail', async () => {
    const product = await catalogService.getProduct(productSlug)
    expect(product.variants).toHaveLength(2)
    expect(product.images[0].primary).toBe(true)
    expect(product.collections[0].slug).toBe(collectionSlug)
  })
})
