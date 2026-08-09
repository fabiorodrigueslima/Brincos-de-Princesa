import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const migrationPattern = /^(\d{3})_([a-z0-9_]+)\.sql$/
const migrationLock = 1_986_032_026

export function migrationChecksum(sql) {
  const normalizedSql = sql.replaceAll('\r\n', '\n')
  return createHash('sha256').update(normalizedSql, 'utf8').digest('hex')
}

export async function loadMigrations(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const invalidSqlFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql') && !migrationPattern.test(entry.name))
    .map((entry) => entry.name)

  if (invalidSqlFiles.length > 0) {
    throw new Error(`Nome de migration inválido: ${invalidSqlFiles.join(', ')}`)
  }

  const migrations = []
  for (const entry of entries) {
    if (!entry.isFile()) continue
    const match = entry.name.match(migrationPattern)
    if (!match) continue

    const sql = await readFile(resolve(directory, entry.name), 'utf8')
    migrations.push({
      version: Number(match[1]),
      name: match[2],
      fileName: entry.name,
      sql,
      checksum: migrationChecksum(sql),
    })
  }

  migrations.sort((left, right) => left.version - right.version)
  const versions = new Set()
  for (const migration of migrations) {
    if (versions.has(migration.version)) {
      throw new Error(`Versão de migration duplicada: ${migration.version}`)
    }
    versions.add(migration.version)
  }

  return migrations
}

async function ensureControlTable(client) {
  await client.query('BEGIN')
  try {
    await client.query('SET LOCAL ROLE brinco_owner')
    await client.query(`
      CREATE TABLE IF NOT EXISTS app.schema_migrations (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        version INTEGER NOT NULL UNIQUE CHECK (version > 0),
        name VARCHAR(160) NOT NULL UNIQUE,
        checksum CHAR(64) NOT NULL CHECK (checksum ~ '^[a-f0-9]{64}$'),
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)
    await client.query('REVOKE ALL PRIVILEGES ON app.schema_migrations FROM PUBLIC, brinco_app')
    await client.query('REVOKE ALL PRIVILEGES ON app.schema_migrations_id_seq FROM PUBLIC, brinco_app')
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
}

export async function runMigrations({ client, directory }) {
  const migrations = await loadMigrations(directory)
  const result = { applied: [], skipped: [], pending: migrations.length, total: migrations.length }

  await client.query('SELECT pg_advisory_lock($1)', [migrationLock])
  try {
    await ensureControlTable(client)
    const appliedResult = await client.query(
      'SELECT version, name, checksum FROM app.schema_migrations ORDER BY version',
    )
    const appliedByVersion = new Map(appliedResult.rows.map((row) => [Number(row.version), row]))

    for (const migration of migrations) {
      const previous = appliedByVersion.get(migration.version)
      if (previous) {
        if (previous.name !== migration.name || previous.checksum.trim() !== migration.checksum) {
          throw new Error(`Migration ${migration.fileName} foi alterada depois de aplicada`)
        }
        result.skipped.push(migration.fileName)
        result.pending -= 1
        continue
      }

      await client.query('BEGIN')
      try {
        await client.query('SET LOCAL ROLE brinco_owner')
        await client.query(migration.sql)
        await client.query({
          text: `INSERT INTO app.schema_migrations (version, name, checksum)
                 VALUES ($1, $2, $3)`,
          values: [migration.version, migration.name, migration.checksum],
        })
        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK')
        throw new Error(`Falha na migration ${migration.fileName}: ${error.message}`, { cause: error })
      }

      result.applied.push(migration.fileName)
      result.pending -= 1
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [migrationLock])
  }

  return result
}
