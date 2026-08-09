import { z } from 'zod'

export const cartValidationSchema = z.object({
  items: z.array(z.object({
    variantId: z.number().int().positive(),
    quantity: z.number().int().min(1).max(99),
  }).passthrough()).max(50),
}).strict()
