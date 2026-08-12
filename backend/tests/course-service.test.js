import { describe, expect, it } from 'vitest'
import { createCourseService } from '../src/services/courseService.js'

describe('course service', () => {
  it('maps public list pagination', async () => {
    const service = createCourseService({ list: async () => ({ rows: [{ id: 1, nome: 'Dados de demonstração', slug: 'dados-demonstracao', resumo: 'Somente teste.', destaque: false }], total: 1 }) })
    await expect(service.list({ page: 1, limit: 12 })).resolves.toMatchObject({ items: [{ name: 'Dados de demonstração' }], pagination: { total: 1, totalPages: 1 } })
  })
  it('returns controlled 404', async () => {
    const service = createCourseService({ findBySlug: async () => null })
    await expect(service.get('inexistente')).rejects.toMatchObject({ status: 404, code: 'COURSE_NOT_FOUND' })
  })
})
