import { courseService } from '../services/courseService.js'

export async function listCourses(req, res) {
  const result = await courseService.list(req.validated.query)
  res.json({ data: result.items, pagination: result.pagination })
}

export async function getCourse(req, res) {
  res.json({ data: await courseService.get(req.validated.params.slug) })
}
