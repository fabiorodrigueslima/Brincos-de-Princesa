import pg from "pg";
import { env } from "./env.js";

const { Pool } = pg;

const pool = env.DATABASE_URL
  ? new Pool({
      connectionString: env.DATABASE_URL,
      max: env.DB_POOL_MAX,
      idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS,
      connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT_MS,
      application_name: "brinco-de-princesa-api",
      options: "-c search_path=app,public",
      ssl: env.DB_SSL ? { rejectUnauthorized: true } : false,
    })
  : null;

pool?.on("error", (error) => {
  console.error({ event: "DATABASE_POOL_ERROR", errorName: error.name });
});

export async function query(textOrConfig, values = []) {
  if (!pool) throw new Error("DATABASE_NOT_CONFIGURED");
  const config =
    typeof textOrConfig === "string"
      ? { text: textOrConfig, values }
      : textOrConfig;
  return pool.query(config);
}

export async function transaction(work) {
  if (!pool) throw new Error("DATABASE_NOT_CONFIGURED");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function checkDatabase() {
  if (!pool) return false;

  try {
    const result = await pool.query({
      name: "health-check",
      text: "SELECT 1 AS ok",
      values: [],
    });
    return result.rows[0]?.ok === 1;
  } catch {
    return false;
  }
}

export async function closeDatabase() {
  if (pool) await pool.end();
}
