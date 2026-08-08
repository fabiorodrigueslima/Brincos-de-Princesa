import { closeDatabase, query } from '../config/database.js'

try {
  const result = await query({
    text: `
      SELECT
        current_database() AS database_name,
        current_user AS database_user,
        (
          SELECT count(*)::integer
          FROM unnest(ARRAY[
            'categorias', 'colecoes', 'produtos', 'produto_variantes',
            'produto_imagens', 'produto_colecoes'
          ]) AS required_table(name)
          WHERE has_table_privilege(current_user, format('app.%I', name), 'SELECT')
        ) AS runtime_table_count,
        (SELECT count(*)::integer FROM app.categorias WHERE ativa = TRUE) AS active_categories
    `,
    values: [],
  })
  const status = result.rows[0]
  const valid = status.runtime_table_count === 6

  console.log({
    connected: true,
    database: status.database_name,
    user: status.database_user,
    runtimeTables: status.runtime_table_count,
    activeCategories: status.active_categories,
    schemaValid: valid,
  })
  if (!valid) process.exitCode = 1
} catch (error) {
  console.error({ connected: false, error: error.message === 'DATABASE_NOT_CONFIGURED' ? 'DATABASE_NOT_CONFIGURED' : error.code ?? error.name })
  process.exitCode = 1
} finally {
  await closeDatabase()
}
