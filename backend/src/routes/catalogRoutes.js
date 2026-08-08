import { Router } from 'express'
import { getCollection, listCategories, listCollections } from '../controllers/catalogController.js'
import { validateRequest } from '../middlewares/validateRequest.js'
import { slugParamSchema } from '../validators/catalogValidators.js'

export const catalogRouter = Router()
catalogRouter.get('/categories', listCategories)
catalogRouter.get('/collections', listCollections)
catalogRouter.get('/collections/:slug', validateRequest(slugParamSchema, 'params'), getCollection)
