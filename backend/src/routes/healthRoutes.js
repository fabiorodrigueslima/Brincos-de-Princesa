import { Router } from 'express'
import { getLiveness, getReadiness } from '../controllers/healthController.js'

export const healthRouter = Router()
healthRouter.get('/live', getLiveness)
healthRouter.get('/ready', getReadiness)
