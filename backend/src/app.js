import express from 'express'
import { resolve } from 'node:path'
import { env } from './config/env.js'
import { errorHandler } from './middlewares/errorHandler.js'
import { notFound } from './middlewares/notFound.js'
import { requestContext } from './middlewares/requestContext.js'
import { apiRouter } from './routes/index.js'
import { corsPolicy, publicRateLimit, securityHeaders } from './security/httpSecurity.js'

export const app = express()
app.disable('x-powered-by')
app.set('trust proxy', env.TRUST_PROXY)
app.set('adminOrigins', env.frontendOrigins)
app.use(requestContext)
app.use(securityHeaders)
app.use(corsPolicy)
app.use(express.json({ limit: '100kb', strict: true }))
if (env.STORAGE_PROVIDER === 'local' && env.NODE_ENV !== 'production') app.use('/uploads', express.static(resolve(process.cwd(),'uploads'),{fallthrough:false,index:false,maxAge:'1h'}))
app.use('/api/v1', publicRateLimit, apiRouter)
app.use(notFound)
app.use(errorHandler)
