import { readFile } from 'node:fs/promises'

export async function runSqlFile({ client, filePath, role = 'brinco_owner' }) {
  const sql = await readFile(filePath, 'utf8')
  if (!/^[a-z_][a-z0-9_]*$/.test(role)) throw new Error('Nome de role inválido para execução SQL')

  await client.query('BEGIN')
  try {
    await client.query(`SET LOCAL ROLE "${role}"`)
    await client.query(sql)
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
}
