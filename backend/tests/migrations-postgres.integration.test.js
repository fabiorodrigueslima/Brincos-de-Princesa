import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runMigrations } from "../src/database/migrationRunner.js";

const { Client } = pg;
const testAdminDatabaseUrl = process.env.TEST_DATABASE_ADMIN_URL;
const databaseName = testAdminDatabaseUrl
  ? new URL(testAdminDatabaseUrl).pathname.slice(1)
  : "";
const migrationsDirectory = resolve(
  import.meta.dirname,
  "../../database/migrations",
);
let client;
let temporaryDirectories = [];

async function temporaryMigrations(files) {
  const directory = await mkdtemp(join(tmpdir(), "brinco-pg-migrations-"));
  temporaryDirectories.push(directory);
  for (const [name, sql] of Object.entries(files))
    await writeFile(join(directory, name), sql, "utf8");
  return directory;
}

describe("PostgreSQL migrations", () => {
  beforeAll(async () => {
    if (!testAdminDatabaseUrl || !databaseName.endsWith("_test")) {
      throw new Error(
        "Migrations de integração exigem o banco protegido com sufixo _test",
      );
    }
    client = new Client({ connectionString: testAdminDatabaseUrl });
    await client.connect();
  });

  afterAll(async () => {
    if (client) await client.end();
    await Promise.all(
      temporaryDirectories.map((directory) =>
        rm(directory, { recursive: true, force: true }),
      ),
    );
    temporaryDirectories = [];
  });

  it("applies, records and does not reapply all migrations", async () => {
    const first = await runMigrations({
      client,
      directory: migrationsDirectory,
    });
    const second = await runMigrations({
      client,
      directory: migrationsDirectory,
    });
    const recorded = await client.query(
      "SELECT version, name, checksum FROM app.schema_migrations WHERE version = 1",
    );

    expect(first.applied).toEqual([
      "001_baseline.sql",
      "002_commercial_categories.sql",
      "003_courses.sql",
      "004_orders_payments.sql",
      "005_admin_security.sql",
      "006_mercado_pago_checkout.sql",
    ]);
    expect(first.pending).toBe(0);
    expect(second.applied).toEqual([]);
    expect(second.skipped).toEqual([
      "001_baseline.sql",
      "002_commercial_categories.sql",
      "003_courses.sql",
      "004_orders_payments.sql",
      "005_admin_security.sql",
      "006_mercado_pago_checkout.sql",
    ]);
    expect(recorded.rows[0]).toMatchObject({ version: 1, name: "baseline" });
    expect(recorded.rows[0].checksum.trim()).toMatch(/^[a-f0-9]{64}$/);

    const categories = await client.query(
      `SELECT slug, ativa FROM app.categorias WHERE slug IN ('brincos','aneis','colares','pulseiras','resina','florais') ORDER BY slug`,
    );
    expect(
      categories.rows.filter((row) => row.ativa).map((row) => row.slug),
    ).toEqual(["aneis", "brincos", "colares", "pulseiras"]);
    const courseTables = await client.query(
      "SELECT to_regclass('app.cursos') cursos,to_regclass('app.curso_sessoes') sessoes",
    );
    expect(courseTables.rows[0]).toEqual({
      cursos: "app.cursos",
      sessoes: "app.curso_sessoes",
    });
    const reservationConfig = await client.query(
      "SELECT valor FROM app.configuracoes WHERE chave='checkout.reservation_minutes'",
    );
    expect(reservationConfig.rows[0].valor).toBe(30);
  });

  it("rejects a changed checksum for an applied migration", async () => {
    const original = await readFile(
      resolve(migrationsDirectory, "001_baseline.sql"),
      "utf8",
    );
    const directory = await temporaryMigrations({
      "001_baseline.sql": `${original}\n-- alteração proibida`,
    });

    await expect(runMigrations({ client, directory })).rejects.toThrow(
      "foi alterada depois de aplicada",
    );
  });

  it("rolls back every statement and registration when a migration fails", async () => {
    const directory = await temporaryMigrations({
      "999_rollback_probe.sql": `
        CREATE TABLE app.migration_rollback_probe (id INTEGER PRIMARY KEY);
        INSERT INTO app.migration_rollback_probe (id) VALUES (1);
        SELECT * FROM app.table_that_does_not_exist;
      `,
    });

    await expect(runMigrations({ client, directory })).rejects.toThrow(
      "Falha na migration",
    );

    const state = await client.query(`
      SELECT to_regclass('app.migration_rollback_probe') AS probe,
             EXISTS (SELECT 1 FROM app.schema_migrations WHERE version = 999) AS recorded
    `);
    expect(state.rows[0]).toEqual({ probe: null, recorded: false });
  });
});
