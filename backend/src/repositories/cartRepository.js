import { query } from '../config/database.js'

export function createCartRepository(dbQuery = query) {
  return {
    async findVariantsByIds(variantIds) {
      if (variantIds.length === 0) return []
      const result = await dbQuery({
        text: `
          SELECT v.id AS variante_id, v.sku, v.nome AS variante_nome, v.atributos, v.ativa,
                 v.preco, v.preco_promocional,
                 GREATEST(v.estoque - v.estoque_reservado, 0)::integer AS estoque_disponivel,
                 p.id AS produto_id, p.nome AS produto_nome, p.slug AS produto_slug,
                 p.status AS produto_status, p.peso_gramas,
                 image.url AS imagem_url, image.alt_text AS imagem_alt
            FROM app.produto_variantes v
            JOIN app.produtos p ON p.id = v.produto_id
            LEFT JOIN LATERAL (
              SELECT pi.url, pi.alt_text
                FROM app.produto_imagens pi
               WHERE pi.produto_id = p.id
                 AND (pi.variante_id IS NULL OR pi.variante_id = v.id)
               ORDER BY (pi.variante_id = v.id) DESC, pi.principal DESC, pi.ordem, pi.id
               LIMIT 1
            ) image ON TRUE
           WHERE v.id = ANY($1::bigint[])
        `,
        values: [variantIds],
      })
      return result.rows
    },
  }
}

export const cartRepository = createCartRepository()
