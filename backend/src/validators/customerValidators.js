import { z } from 'zod'

const password = z.string().min(12).max(200)
const address = z.object({ postalCode: z.string().regex(/^\d{8}$/), street: z.string().trim().min(2).max(160), number: z.string().trim().min(1).max(20), complement: z.string().trim().max(120).default(''), neighborhood: z.string().trim().min(2).max(100), city: z.string().trim().min(2).max(100), state: z.string().regex(/^[A-Z]{2}$/), primary: z.boolean().default(false) }).strict()

export const customerRegisterSchema = z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().email().max(254), phone: z.string().trim().regex(/^\+?[0-9 ()-]{8,24}$/), password }).strict()
export const customerLoginSchema = z.object({ email: z.string().trim().email().max(254), password }).strict()
export const customerProfileSchema = z.object({ name: z.string().trim().min(2).max(100), phone: z.string().trim().regex(/^\+?[0-9 ()-]{8,24}$/) }).strict()
export const customerPasswordSchema = z.object({ currentPassword: password, newPassword: password }).strict().refine((v) => v.currentPassword !== v.newPassword, { path: ['newPassword'], message: 'A nova senha deve ser diferente.' })
export const customerForgotSchema = z.object({ email: z.string().trim().email().max(254) }).strict()
export const customerResetSchema = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/), password }).strict()
export const customerAddressSchema = address
export const customerIdParamsSchema = z.object({ id: z.coerce.number().int().positive() }).strict()
export const privacyRequestSchema=z.object({type:z.enum(['ACCESS','CORRECTION','DELETION'])}).strict()
