import { courseRepository } from '../repositories/courseRepository.js'
import { AppError } from '../utils/AppError.js'

const courseDto = (row) => ({ id: row.id, name: row.nome, slug: row.slug, summary: row.resumo, description: row.descricao, featured: row.destaque, publishedAt: row.publicado_em, image: row.imagem_url ? { url: row.imagem_url, alt: row.imagem_alt || row.nome } : null })

export function createCourseService(repository = courseRepository) {
  return {
    async list(filters) {
      const result = await repository.list(filters)
      return { items: result.rows.map(courseDto), pagination: { page: filters.page, limit: filters.limit, total: result.total, totalPages: Math.ceil(result.total / filters.limit) } }
    },
    async get(slug) {
      const result = await repository.findBySlug(slug)
      if (!result) throw new AppError(404, 'COURSE_NOT_FOUND', 'Curso não encontrado.')
      return { ...courseDto(result.course), sessions: result.sessions.map((row) => ({ id: row.id, startsAt: row.inicia_em, endsAt: row.termina_em, location: row.local, seats: row.vagas })) }
    },
  }
}

export const courseService = createCourseService()
