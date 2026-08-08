import { query } from '../config/database.js'

export function createCatalogRepository(dbQuery = query) {
  return {
    async listCategories() {
      const result = await dbQuery(`
        SELECT c.id, c.nome, c.slug, c.descricao,
               count(p.id)::integer AS quantidade_produtos
          FROM app.categorias c
          LEFT JOIN app.produtos p
            ON p.categoria_id = c.id AND p.status = 'ACTIVE'
         WHERE c.ativa = TRUE
         GROUP BY c.id
         ORDER BY c.ordem, c.nome
      `)
      return result.rows
    },

    async listCollections() {
      const result = await dbQuery(`
        SELECT c.id, c.nome, c.slug, c.descricao, c.imagem_url, c.destaque,
               count(p.id)::integer AS quantidade_produtos
          FROM app.colecoes c
          LEFT JOIN app.produto_colecoes pc ON pc.colecao_id = c.id
          LEFT JOIN app.produtos p ON p.id = pc.produto_id AND p.status = 'ACTIVE'
         WHERE c.ativa = TRUE
         GROUP BY c.id
         ORDER BY c.destaque DESC, c.publicada_em DESC NULLS LAST, c.nome
      `)
      return result.rows
    },

    async findCollectionBySlug(slug) {
      const result = await dbQuery({
        text: `
          SELECT c.id, c.nome, c.slug, c.descricao, c.imagem_url, c.destaque,
                 count(p.id)::integer AS quantidade_produtos
            FROM app.colecoes c
            LEFT JOIN app.produto_colecoes pc ON pc.colecao_id = c.id
            LEFT JOIN app.produtos p ON p.id = pc.produto_id AND p.status = 'ACTIVE'
           WHERE c.slug = $1 AND c.ativa = TRUE
           GROUP BY c.id
        `,
        values: [slug],
      })
      return result.rows[0] ?? null
    },
  }
}

export const catalogRepository = createCatalogRepository()
