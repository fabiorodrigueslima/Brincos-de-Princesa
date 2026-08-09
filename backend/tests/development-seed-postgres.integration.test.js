import { resolve } from 'node:path'
import pg from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { runSqlFile } from '../src/database/sqlFileRunner.js'

const { Client } = pg
const testAdminDatabaseUrl = process.env.TEST_DATABASE_ADMIN_URL
const databaseName = testAdminDatabaseUrl ? new URL(testAdminDatabaseUrl).pathname.slice(1) : ''
const seedFile = resolve(import.meta.dirname, '../../database/seeds/development/001_catalog_demo.sql')
let client
let productId
let collectionId

describe('development catalog seed', () => {
  beforeAll(async () => {
    if (!testAdminDatabaseUrl || !databaseName.endsWith('_test')) {
      throw new Error('Teste do seed exige o banco protegido com sufixo _test')
    }
    client = new Client({ connectionString: testAdminDatabaseUrl })
    await client.connect()
  })

  afterAll(async () => {
    if (!client) return
    try {
      if (productId) {
        await client.query('DELETE FROM app.produto_colecoes WHERE produto_id = $1', [productId])
        await client.query('DELETE FROM app.produto_imagens WHERE produto_id = $1', [productId])
        await client.query('DELETE FROM app.produto_variantes WHERE produto_id = $1', [productId])
        await client.query('DELETE FROM app.produtos WHERE id = $1', [productId])
      }
      if (collectionId) await client.query('DELETE FROM app.colecoes WHERE id = $1', [collectionId])
    } finally {
      await client.end()
    }
  })

  it('is idempotent and creates one complete demonstration product', async () => {
    await runSqlFile({ client, filePath: seedFile })
    await runSqlFile({ client, filePath: seedFile })

    const product = await client.query({
      text: `SELECT p.id, p.status, p.descricao, c.id AS collection_id,
                    count(DISTINCT v.id)::integer AS variants,
                    count(DISTINCT v.sku)::integer AS unique_skus,
                    min(v.estoque)::integer AS minimum_stock,
                    count(DISTINCT i.id)::integer AS images,
                    count(DISTINCT pc.colecao_id)::integer AS collections,
                    count(DISTINCT i.id) FILTER (WHERE i.principal)::integer AS primary_images
               FROM app.produtos p
               JOIN app.produto_variantes v ON v.produto_id = p.id
               JOIN app.produto_imagens i ON i.produto_id = p.id
               JOIN app.produto_colecoes pc ON pc.produto_id = p.id
               JOIN app.colecoes c ON c.id = pc.colecao_id AND c.slug = 'demonstracao'
              WHERE p.slug = 'brinco-floral-em-resina-demo'
              GROUP BY p.id, c.id`,
    })

    expect(product.rows).toHaveLength(1)
    expect(product.rows[0]).toMatchObject({
      status: 'ACTIVE',
      variants: 3,
      unique_skus: 3,
      minimum_stock: 1,
      images: 2,
      collections: 1,
      primary_images: 1,
    })
    expect(product.rows[0].descricao).toContain('DADOS DE DESENVOLVIMENTO')
    productId = product.rows[0].id
    collectionId = product.rows[0].collection_id
  })
})
