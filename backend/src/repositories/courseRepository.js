import { query } from '../config/database.js'

export function createCourseRepository(dbQuery = query) {
  return {
    async list({ page, limit }) {
      const count = await dbQuery("SELECT count(*)::integer total FROM app.cursos WHERE status='PUBLISHED' AND publicado_em <= now()")
      const result = await dbQuery({
        text: `SELECT id,nome,slug,resumo,imagem_url,imagem_alt,destaque,publicado_em
                 FROM app.cursos WHERE status='PUBLISHED' AND publicado_em <= now()
                ORDER BY destaque DESC,publicado_em DESC,id DESC LIMIT $1 OFFSET $2`,
        values: [limit, (page - 1) * limit],
      })
      return { rows: result.rows, total: count.rows[0].total }
    },
    async findBySlug(slug) {
      const course = await dbQuery({
        text: `SELECT id,nome,slug,resumo,descricao,imagem_url,imagem_alt,destaque,publicado_em
                 FROM app.cursos WHERE slug=$1 AND status='PUBLISHED' AND publicado_em <= now()`,
        values: [slug],
      })
      if (!course.rows[0]) return null
      const sessions = await dbQuery({
        text: `SELECT id,inicia_em,termina_em,local,vagas
                 FROM app.curso_sessoes
                WHERE curso_id=$1 AND publica=TRUE AND status='SCHEDULED'
                  AND (inicia_em IS NULL OR inicia_em >= now())
                ORDER BY inicia_em NULLS LAST,id`,
        values: [course.rows[0].id],
      })
      return { course: course.rows[0], sessions: sessions.rows }
    },
  }
}

export const courseRepository = createCourseRepository()
