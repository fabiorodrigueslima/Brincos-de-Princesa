import { z } from 'zod'

const slug = z.string().trim().min(1).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)

export const productListQuerySchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  category: slug.max(120).optional(),
  collection: slug.max(140).optional(),
  promotions: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  sort: z.enum(['newest', 'name', 'price_asc', 'price_desc']).default('newest'),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
}).strict()

export const slugParamSchema = z.object({ slug }).strict()
