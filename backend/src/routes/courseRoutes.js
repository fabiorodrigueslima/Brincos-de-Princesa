import { Router } from 'express'
import { getCourse, listCourses } from '../controllers/courseController.js'
import { validateRequest } from '../middlewares/validateRequest.js'
import { courseListQuerySchema, courseSlugSchema } from '../validators/courseValidators.js'

export const courseRouter = Router()
courseRouter.get('/', validateRequest(courseListQuerySchema, 'query'), listCourses)
courseRouter.get('/:slug', validateRequest(courseSlugSchema, 'params'), getCourse)
