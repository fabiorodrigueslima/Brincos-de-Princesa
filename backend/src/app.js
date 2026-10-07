import { createJobRouter } from './routes/jobRoutes.js';
import { webhookRouter } from './routes/webhookRoutes.js';
import express from 'express'
import { resolve } from 'node:path'
import { env } from './config/env.js'
import { catalogMode } from './middlewares/catalogMode.js'
import { errorHandler } from './middlewares/errorHandler.js'
import { notFound } from './middlewares/notFound.js'
import { requestContext } from './middlewares/requestContext.js'
import { apiRouter } from './routes/index.js'
import { corsPolicy, publicRateLimit, securityHeaders } from './security/httpSecurity.js'

export const app = express()
export default app
app.disable('x-powered-by')
app.set('trust proxy', env.TRUST_PROXY)
app.set('adminOrigins', env.frontendOrigins)
app.use(requestContext)
app.use(securityHeaders)
app.use(corsPolicy)
app.use(express.json({ limit: '100kb', strict: true }))
app.use(['/api/v1/cart', '/api/v1/checkout', '/api/v1/orders', '/api/v1/customers', '/api/v1/webhooks', '/api/internal/jobs'], catalogMode)
if (env.STORAGE_PROVIDER === 'local' && env.NODE_ENV !== 'production') app.use('/uploads', express.static(resolve(process.cwd(),'uploads'),{fallthrough:false,index:false,maxAge:'1h'}))
app.use('/api/internal/jobs', createJobRouter())
app.use('/api/v1/webhooks', webhookRouter)
app.use('/api/v1', publicRateLimit, apiRouter)
app.use(notFound)
app.use(errorHandler)
