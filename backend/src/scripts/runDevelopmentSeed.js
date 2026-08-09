import { resolve } from 'node:path'
import pg from 'pg'
import { assertDevelopmentSeedTarget, resolveAdminConnection } from '../database/adminConnection.js'
import { runSqlFile } from '../database/sqlFileRunner.js'

const { Client } = pg
const seedFile = resolve(import.meta.dirname, '../../../database/seeds/development/001_catalog_demo.sql')
const { adminUrl } = resolveAdminConnection()
assertDevelopmentSeedTarget(adminUrl)

const client = new Client({
  connectionString: adminUrl.toString(),
  application_name: 'brinco-de-princesa-development-seed',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false,
})

await client.connect()
try {
  await runSqlFile({ client, filePath: seedFile })
  const result = await client.query({
    text: `SELECT p.slug, count(DISTINCT v.id)::integer AS variants,
                  count(DISTINCT i.id)::integer AS images
             FROM app.produtos p
             LEFT JOIN app.produto_variantes v ON v.produto_id = p.id
             LEFT JOIN app.produto_imagens i ON i.produto_id = p.id
            WHERE p.slug = $1
            GROUP BY p.slug`,
    values: ['brinco-floral-em-resina-demo'],
  })
  console.log({ event: 'DEVELOPMENT_SEED_COMPLETE', data: result.rows[0] })
} finally {
  await client.end()
}
