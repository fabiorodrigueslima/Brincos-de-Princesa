import { z } from 'zod'
import { checkoutQuoteSchema } from './checkoutValidators.js'

export const createOrderSchema = checkoutQuoteSchema.extend({ shippingOptionId: z.string().trim().min(1).max(120) }).strict()
export const orderParamsSchema = z.object({ code: z.string().regex(/^BP-[A-F0-9]{16}$/) }).strict()
export const paymentParamsSchema = orderParamsSchema
export const createPaymentSchema = z.object({ method: z.enum(['PIX', 'CARD']) }).strict()
export const webhookParamsSchema = z.object({ provider: z.string().regex(/^[a-z0-9-]{2,32}$/) }).strict()
