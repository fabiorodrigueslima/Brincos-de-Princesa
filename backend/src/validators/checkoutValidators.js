import { z } from 'zod'

const postalCode = z.string().regex(/^\d{8}$/, 'CEP deve conter 8 números')
const item = z.object({ variantId: z.number().int().positive(), quantity: z.number().int().min(1).max(99) }).strict()
const customer = z.object({
  name: z.string().trim().min(2).max(220),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{8,24}$/),
}).strict()
const address = z.object({
  postalCode,
  street: z.string().trim().min(2).max(160),
  number: z.string().trim().min(1).max(20),
  complement: z.string().trim().max(120).optional().default(''),
  neighborhood: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().regex(/^[A-Z]{2}$/),
}).strict()

export const postalCodeParamsSchema = z.object({ postalCode }).strict()
export const checkoutQuoteSchema = z.object({
  items: z.array(item).min(1).max(50), customer, address,
  shippingOptionId: z.string().trim().min(1).max(120).optional(),
}).strict()
