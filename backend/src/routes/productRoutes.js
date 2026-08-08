import { Router } from 'express'
import { getProduct, listProducts } from '../controllers/catalogController.js'
import { validateRequest } from '../middlewares/validateRequest.js'
import { productListQuerySchema, slugParamSchema } from '../validators/catalogValidators.js'

export const productRouter = Router()
productRouter.get('/', validateRequest(productListQuerySchema, 'query'), listProducts)
productRouter.get('/:slug', validateRequest(slugParamSchema, 'params'), getProduct)
