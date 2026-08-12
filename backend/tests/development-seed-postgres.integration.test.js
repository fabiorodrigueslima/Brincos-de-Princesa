import { resolve } from 'node:path'
import pg from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { runSqlFile } from '../src/database/sqlFileRunner.js'

const { Client } = pg
const testAdminDatabaseUrl = process.env.TEST_DATABASE_ADMIN_URL
const databaseName = testAdminDatabaseUrl ? new URL(testAdminDatabaseUrl).pathname.slice(1) : ''
const seedFile = resolve(import.meta.dirname, '../../database/seeds/development/001_catalog_demo.sql')
const demoSlugs = ['brinco-floral-em-resina-demo','anel-textura-demo','colar-forma-demo','pulseira-gesto-demo']
let client

describe('development catalog seed', () => {
  beforeAll(async () => {
    if (!testAdminDatabaseUrl || !databaseName.endsWith('_test')) throw new Error('Teste do seed exige banco protegido com sufixo _test')
    client = new Client({ connectionString: testAdminDatabaseUrl })
    await client.connect()
  })

  afterAll(async () => {
    if (!client) return
    try {
      const ids = await client.query('SELECT id FROM app.produtos WHERE slug = ANY($1)', [demoSlugs])
      const productIds = ids.rows.map((row) => row.id)
      if (productIds.length) {
        await client.query('DELETE FROM app.produto_colecoes WHERE produto_id = ANY($1)', [productIds])
        await client.query('DELETE FROM app.produto_imagens WHERE produto_id = ANY($1)', [productIds])
        await client.query('DELETE FROM app.produto_variantes WHERE produto_id = ANY($1)', [productIds])
        await client.query('DELETE FROM app.produtos WHERE id = ANY($1)', [productIds])
      }
      await client.query("DELETE FROM app.colecoes WHERE slug='demonstracao'")
    } finally { await client.end() }
  })

  it('is idempotent and covers commercial catalog scenarios', async () => {
    await runSqlFile({ client, filePath: seedFile })
    await runSqlFile({ client, filePath: seedFile })
    const products = await client.query(`SELECT c.slug AS category,p.slug,count(DISTINCT v.id)::integer variants,count(DISTINCT i.id)::integer images,bool_or(v.preco_promocional IS NOT NULL AND v.preco_promocional>0 AND v.preco_promocional<v.preco) promotion,(SELECT sum(stock_variant.estoque)::integer FROM app.produto_variantes stock_variant WHERE stock_variant.produto_id=p.id) stock FROM app.produtos p JOIN app.categorias c ON c.id=p.categoria_id JOIN app.produto_variantes v ON v.produto_id=p.id JOIN app.produto_imagens i ON i.produto_id=p.id WHERE p.slug=ANY($1) GROUP BY c.slug,p.id,p.slug ORDER BY c.slug`, [demoSlugs])
    expect(products.rows).toHaveLength(4)
    expect(products.rows.map((row) => row.category).sort()).toEqual(['aneis','brincos','colares','pulseiras'])
    expect(products.rows.find((row) => row.category === 'brincos')).toMatchObject({ variants: 3, images: 2, promotion: true, stock: 6 })
    expect(products.rows.find((row) => row.category === 'pulseiras')).toMatchObject({ stock: 0 })
    const relation = await client.query(`SELECT count(DISTINCT pc.produto_id)::integer products FROM app.produto_colecoes pc JOIN app.colecoes c ON c.id=pc.colecao_id WHERE c.slug='demonstracao'`)
    expect(relation.rows[0].products).toBe(3)
    const skus = await client.query(`SELECT count(*)::integer total,count(DISTINCT sku)::integer unique_skus FROM app.produto_variantes WHERE produto_id IN (SELECT id FROM app.produtos WHERE slug=ANY($1))`, [demoSlugs])
    expect(skus.rows[0]).toEqual({ total: 6, unique_skus: 6 })
  })
})
