import { Router } from 'express'
import { healthRouter } from './healthRoutes.js'
import { catalogRouter } from './catalogRoutes.js'
import { productRouter } from './productRoutes.js'
import { cartRouter } from './cartRoutes.js'
import { courseRouter } from './courseRoutes.js'
import { checkoutRouter } from './checkoutRoutes.js'
import { orderRouter } from './orderRoutes.js'
import { webhookRouter } from './webhookRoutes.js'
import { adminRouter } from './adminRoutes.js'

export const apiRouter = Router()
apiRouter.use('/health', healthRouter)
apiRouter.use('/catalog', catalogRouter)
apiRouter.use('/products', productRouter)
apiRouter.use('/cart', cartRouter)
apiRouter.use('/courses', courseRouter)
apiRouter.use('/checkout', checkoutRouter)
apiRouter.use('/orders', orderRouter)
apiRouter.use('/webhooks', webhookRouter)
apiRouter.use('/admin', adminRouter)
