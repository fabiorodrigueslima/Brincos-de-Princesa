import { z } from 'zod'

const booleanString = z.enum(['true', 'false']).default('false').transform((value) => value === 'true')

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  FRONTEND_ORIGINS: z.string().default('http://localhost:5173'),
  TRUST_PROXY: z.coerce.number().int().min(0).max(2).default(0),
  DATABASE_URL: z.string().min(1).optional(),
  DB_SSL: booleanString,
  DB_POOL_MAX: z.coerce.number().int().min(1).max(30).default(10),
  DB_IDLE_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(10000),
  DB_CONNECTION_TIMEOUT_MS: z.coerce.number().int().min(500).max(30000).default(3000),
}).superRefine((value, context) => {
  if (value.NODE_ENV === 'production' && !value.DATABASE_URL) {
    context.addIssue({ code: 'custom', path: ['DATABASE_URL'], message: 'obrigatória em produção' })
  }
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  const fields = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')
  throw new Error(`Configuração de ambiente inválida: ${fields}`)
}

export const env = {
  ...parsed.data,
  frontendOrigins: parsed.data.FRONTEND_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean),
}
