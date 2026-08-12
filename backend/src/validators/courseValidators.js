import { z } from 'zod'

const slug = z.string().trim().min(1).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)

export const courseListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(24).default(12),
}).strict()

export const courseSlugSchema = z.object({ slug }).strict()
