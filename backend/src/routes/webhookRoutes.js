import { Router } from 'express'
import { paymentWebhook } from '../controllers/orderController.js'
import { validateRequest } from '../middlewares/validateRequest.js'
import { webhookParamsSchema } from '../validators/orderValidators.js'

export const webhookRouter = Router()
webhookRouter.post('/payments/:provider', validateRequest(webhookParamsSchema, 'params'), paymentWebhook)
