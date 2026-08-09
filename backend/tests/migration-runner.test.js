import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { loadMigrations, migrationChecksum } from '../src/database/migrationRunner.js'

let temporaryDirectory

async function createDirectory() {
  temporaryDirectory = await mkdtemp(join(tmpdir(), 'brinco-migrations-'))
  return temporaryDirectory
}

afterEach(async () => {
  if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true })
  temporaryDirectory = undefined
})

describe('migration runner files', () => {
  it('loads migrations in numeric order with a stable checksum', async () => {
    const directory = await createDirectory()
    await writeFile(join(directory, '002_second.sql'), 'SELECT 2;\n', 'utf8')
    await writeFile(join(directory, '001_first.sql'), 'SELECT 1;\n', 'utf8')

    const migrations = await loadMigrations(directory)

    expect(migrations.map((migration) => migration.fileName)).toEqual([
      '001_first.sql',
      '002_second.sql',
    ])
    expect(migrations[0].checksum).toBe(migrationChecksum('SELECT 1;\n'))
    expect(migrations[0].checksum).toMatch(/^[a-f0-9]{64}$/)
  })

  it('rejects duplicate versions', async () => {
    const directory = await createDirectory()
    await writeFile(join(directory, '001_first.sql'), 'SELECT 1;', 'utf8')
    await writeFile(join(directory, '001_duplicate.sql'), 'SELECT 2;', 'utf8')

    await expect(loadMigrations(directory)).rejects.toThrow('Versão de migration duplicada')
  })

  it('rejects SQL files outside the immutable naming convention', async () => {
    const directory = await createDirectory()
    await writeFile(join(directory, 'migration-livre.sql'), 'SELECT 1;', 'utf8')

    await expect(loadMigrations(directory)).rejects.toThrow('Nome de migration inválido')
  })
})
