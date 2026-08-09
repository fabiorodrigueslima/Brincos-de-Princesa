import { spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import pg from 'pg'

const { Client } = pg
const databaseDirectory = resolve(import.meta.dirname, '../../database')
const backendDirectory = resolve(import.meta.dirname, '..')
const localHosts = new Set(['localhost', '127.0.0.1', '::1'])

function databaseName(url) {
  return decodeURIComponent(url.pathname.replace(/^\//, ''))
}

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`
}

function assertSafeTestTarget(url, developmentDatabaseName) {
  const name = databaseName(url)

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Testes PostgreSQL não podem preparar banco em NODE_ENV=production')
  }
  if (!/^[a-z0-9_]+$/.test(name) || !name.endsWith('_test')) {
    throw new Error('O banco de integração deve ter nome simples e terminar com _test')
  }
  if (name === developmentDatabaseName) {
    throw new Error('O banco de integração não pode ser o banco de desenvolvimento')
  }
  if (!localHosts.has(url.hostname) && process.env.ALLOW_REMOTE_TEST_DATABASE !== 'true') {
    throw new Error('Banco de teste remoto exige ALLOW_REMOTE_TEST_DATABASE=true')
  }
}

async function readSql(fileName) {
  const sql = await readFile(resolve(databaseDirectory, fileName), 'utf8')
  return sql
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith('\\'))
    .join('\n')
}

function resolveConnections() {
  const developmentUrl = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null
  const developmentName = developmentUrl ? databaseName(developmentUrl) : null
  let runtimeUrl

  if (process.env.TEST_DATABASE_URL) {
    runtimeUrl = new URL(process.env.TEST_DATABASE_URL)
  } else {
    if (!developmentUrl || !localHosts.has(developmentUrl.hostname)) {
      throw new Error('Defina TEST_DATABASE_URL para executar a integração PostgreSQL')
    }
    runtimeUrl = new URL(developmentUrl)
    runtimeUrl.pathname = `/${developmentName}_test`
  }

  assertSafeTestTarget(runtimeUrl, developmentName)

  if (!process.env.TEST_DATABASE_ADMIN_URL) {
    throw new Error('Defina TEST_DATABASE_ADMIN_URL com uma credencial administrativa separada')
  }

  const maintenanceUrl = new URL(process.env.TEST_DATABASE_ADMIN_URL)
  if (maintenanceUrl.username === runtimeUrl.username || maintenanceUrl.password === runtimeUrl.password) {
    throw new Error('Runtime e administração do PostgreSQL devem usar credenciais diferentes')
  }

  const testAdminUrl = new URL(maintenanceUrl)
  testAdminUrl.pathname = `/${databaseName(runtimeUrl)}`

  return { runtimeUrl, maintenanceUrl, testAdminUrl }
}

async function prepareTestDatabase(runtimeUrl, maintenanceUrl, testAdminUrl) {
  const name = databaseName(runtimeUrl)
  const identifier = quoteIdentifier(name)
  const maintenance = new Client({ connectionString: maintenanceUrl.toString() })

  await maintenance.connect()
  try {
    const exists = await maintenance.query('SELECT 1 FROM pg_database WHERE datname = $1', [name])
    if (exists.rowCount === 0) {
      await maintenance.query(`CREATE DATABASE ${identifier} OWNER brinco_owner ENCODING 'UTF8' TEMPLATE template0`)
    }
    await maintenance.query(`REVOKE ALL ON DATABASE ${identifier} FROM PUBLIC`)
    await maintenance.query(`GRANT CONNECT ON DATABASE ${identifier} TO brinco_app`)
  } finally {
    await maintenance.end()
  }

  const admin = new Client({ connectionString: testAdminUrl.toString() })
  await admin.connect()
  try {
    const current = await admin.query('SELECT current_database() AS database')
    if (current.rows[0].database !== name || !name.endsWith('_test')) {
      throw new Error('Proteção recusou reinicializar o schema de teste')
    }

    await admin.query('DROP SCHEMA IF EXISTS app CASCADE')
    await admin.query('CREATE SCHEMA app AUTHORIZATION brinco_owner')
    await admin.query('GRANT USAGE ON SCHEMA app TO brinco_app')
    await admin.query(`ALTER ROLE brinco_app IN DATABASE ${identifier} SET search_path = app, public`)
    await admin.query(await readSql('tables.sql'))
    await admin.query(await readSql('indexes.sql'))
    await admin.query(await readSql('seed.sql'))
  } finally {
    await admin.end()
  }
}

const { runtimeUrl, maintenanceUrl, testAdminUrl } = resolveConnections()
await prepareTestDatabase(runtimeUrl, maintenanceUrl, testAdminUrl)

const vitestEntry = resolve(backendDirectory, '../node_modules/vitest/vitest.mjs')
const result = spawnSync(
  process.execPath,
  [
    vitestEntry,
    'run',
    '--no-file-parallelism',
    'tests/migrations-postgres.integration.test.js',
    'tests/development-seed-postgres.integration.test.js',
    'tests/catalog-postgres.integration.test.js',
  ],
  {
    cwd: backendDirectory,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_URL: runtimeUrl.toString(),
      TEST_DATABASE_URL: runtimeUrl.toString(),
      TEST_DATABASE_ADMIN_URL: testAdminUrl.toString(),
    },
    stdio: 'inherit',
  },
)

if (result.error) throw result.error
process.exitCode = result.status ?? 1
