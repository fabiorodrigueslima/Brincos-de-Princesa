import { Router } from 'express'
import { validateCart } from '../controllers/cartController.js'
import { validateRequest } from '../middlewares/validateRequest.js'
import { cartValidationSchema } from '../validators/cartValidators.js'

export const cartRouter = Router()
cartRouter.post('/validate', validateRequest(cartValidationSchema, 'body'), validateCart)
