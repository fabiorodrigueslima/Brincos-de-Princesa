import { query } from '../config/database.js'

const orderBy = {
  newest: 'p.publicado_em DESC NULLS LAST, p.id DESC',
  name: 'p.nome ASC, p.id ASC',
  price_asc: 'menor_preco ASC, p.id ASC',
  price_desc: 'menor_preco DESC, p.id DESC',
}

function buildFilters(filters) {
  const values = []
  const conditions = [
    "p.status = 'ACTIVE'",
    "EXISTS (SELECT 1 FROM app.produto_variantes available_variant WHERE available_variant.produto_id = p.id AND available_variant.ativa = TRUE)",
  ]

  if (filters.q) {
    values.push(`%${filters.q}%`)
    conditions.push(`(p.nome ILIKE $${values.length} OR p.descricao ILIKE $${values.length})`)
  }
  if (filters.category) {
    values.push(filters.category)
    conditions.push(`EXISTS (SELECT 1 FROM app.categorias filter_category WHERE filter_category.id = p.categoria_id AND filter_category.slug = $${values.length} AND filter_category.ativa = TRUE)`)
  }
  if (filters.collection) {
    values.push(filters.collection)
    conditions.push(`EXISTS (SELECT 1 FROM app.produto_colecoes filter_pc JOIN app.colecoes filter_collection ON filter_collection.id = filter_pc.colecao_id WHERE filter_pc.produto_id = p.id AND filter_collection.slug = $${values.length} AND filter_collection.ativa = TRUE)`)
  }
  if (filters.promotions) {
    conditions.push(`EXISTS (
      SELECT 1 FROM app.produto_variantes promotion_variant
       WHERE promotion_variant.produto_id = p.id
         AND promotion_variant.ativa = TRUE
         AND promotion_variant.preco_promocional IS NOT NULL
         AND promotion_variant.preco_promocional > 0
         AND promotion_variant.preco_promocional < promotion_variant.preco
    )`)
  }

  return { conditions, values }
}

export function createProductRepository(dbQuery = query) {
  return {
    async list(filters) {
      const { conditions, values } = buildFilters(filters)
      const where = conditions.join(' AND ')
      const safeOrder = orderBy[filters.sort] ?? orderBy.newest
      const countResult = await dbQuery({
        text: `SELECT count(*)::integer AS total FROM app.produtos p WHERE ${where}`,
        values,
      })

      const pageValues = [...values, filters.limit, (filters.page - 1) * filters.limit]
      const limitPlaceholder = `$${values.length + 1}`
      const offsetPlaceholder = `$${values.length + 2}`
      const result = await dbQuery({
        text: `
          SELECT p.id, p.nome, p.slug, p.descricao, p.novidade, p.destaque,
                 c.nome AS categoria_nome, c.slug AS categoria_slug,
                 price_variant.preco_efetivo AS menor_preco,
                 CASE WHEN price_variant.preco_promocional IS NOT NULL THEN price_variant.preco END AS preco_original,
                 stock.em_estoque,
                 image.url AS imagem_url, image.alt_text AS imagem_alt
            FROM app.produtos p
            LEFT JOIN app.categorias c ON c.id = p.categoria_id
            JOIN LATERAL (
              SELECT v.preco, v.preco_promocional,
                     COALESCE(v.preco_promocional, v.preco) AS preco_efetivo
                FROM app.produto_variantes v
               WHERE v.produto_id = p.id AND v.ativa = TRUE
               ORDER BY COALESCE(v.preco_promocional, v.preco), v.id
               LIMIT 1
            ) price_variant ON TRUE
            JOIN LATERAL (
              SELECT bool_or((v.estoque - v.estoque_reservado) > 0) AS em_estoque
                FROM app.produto_variantes v
               WHERE v.produto_id = p.id AND v.ativa = TRUE
            ) stock ON TRUE
            LEFT JOIN LATERAL (
              SELECT pi.url, pi.alt_text
                FROM app.produto_imagens pi
               WHERE pi.produto_id = p.id
               ORDER BY pi.principal DESC, pi.ordem, pi.id
               LIMIT 1
            ) image ON TRUE
           WHERE ${where}
           ORDER BY ${safeOrder}
           LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
        `,
        values: pageValues,
      })

      return { rows: result.rows, total: countResult.rows[0].total }
    },

    async findBySlug(slug) {
      const productResult = await dbQuery({
        text: `
          SELECT p.id, p.nome, p.slug, p.descricao, p.materiais, p.medidas,
                 p.peso_gramas, p.cuidados, p.prazo_producao_dias,
                 p.novidade, p.destaque, p.meta_title, p.meta_description,
                 c.nome AS categoria_nome, c.slug AS categoria_slug
            FROM app.produtos p
            LEFT JOIN app.categorias c ON c.id = p.categoria_id
           WHERE p.slug = $1 AND p.status = 'ACTIVE'
        `,
        values: [slug],
      })
      const product = productResult.rows[0]
      if (!product) return null

      const [variantsResult, imagesResult, collectionsResult] = await Promise.all([
        dbQuery({
          text: `SELECT id, sku, nome, atributos, preco, preco_promocional, (estoque - estoque_reservado)::integer AS estoque_disponivel FROM app.produto_variantes WHERE produto_id = $1 AND ativa = TRUE ORDER BY id`,
          values: [product.id],
        }),
        dbQuery({
          text: `SELECT id, variante_id, url, alt_text, largura_px, altura_px, ordem, principal FROM app.produto_imagens WHERE produto_id = $1 ORDER BY principal DESC, ordem, id`,
          values: [product.id],
        }),
        dbQuery({
          text: `SELECT c.nome, c.slug FROM app.colecoes c JOIN app.produto_colecoes pc ON pc.colecao_id = c.id WHERE pc.produto_id = $1 AND c.ativa = TRUE ORDER BY pc.ordem, c.nome`,
          values: [product.id],
        }),
      ])

      return {
        product,
        variants: variantsResult.rows,
        images: imagesResult.rows,
        collections: collectionsResult.rows,
      }
    },
  }
}

export const productRepository = createProductRepository()
