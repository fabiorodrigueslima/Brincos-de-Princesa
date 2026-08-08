import { Router } from 'express'
import { healthRouter } from './healthRoutes.js'
import { catalogRouter } from './catalogRoutes.js'
import { productRouter } from './productRoutes.js'

export const apiRouter = Router()
apiRouter.use('/health', healthRouter)
apiRouter.use('/catalog', catalogRouter)
apiRouter.use('/products', productRouter)
