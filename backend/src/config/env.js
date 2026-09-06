import { z } from "zod";

const booleanString = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const schema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    FRONTEND_ORIGINS: z.string().default("http://localhost:5173"),
    TRUST_PROXY: z.coerce.number().int().min(0).max(2).default(0),
    DATABASE_URL: z.string().min(1).optional(),
    DB_SSL: booleanString,
    DB_POOL_MAX: z.coerce.number().int().min(1).max(30).default(10),
    DB_IDLE_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(1000)
      .max(60000)
      .default(10000),
    DB_CONNECTION_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(500)
      .max(30000)
      .default(3000),
    POSTAL_CODE_PROVIDER_URL: z
      .string()
      .url()
      .default("https://brasilapi.com.br/api/cep/v2"),
    EXTERNAL_REQUEST_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(500)
      .max(15000)
      .default(4000),
    SHIPPING_PROVIDER: z.enum(["disabled", "configurable", "superfrete"]).default("configurable"),
    SHIPPING_FIXED_PRICE: z
      .string()
      .regex(/^\d+\.\d{2}$/)
      .default("0.00"),
    SHIPPING_FREE_ABOVE: z
      .string()
      .regex(/^\d+\.\d{2}$/)
      .optional()
      .or(z.literal("")),
    SHIPPING_ESTIMATED_DAYS: z.coerce.number().int().min(0).max(90).default(7),
    SHIPPING_ALLOWED_STATES: z.string().default(""),
    SHIPPING_LOCAL_PICKUP: booleanString,
    SHIPPING_LOCAL_PICKUP_LABEL: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .default("Retirada no ateliê"),
    SUPERFRETE_API_BASE_URL: z.string().url().default("https://sandbox.superfrete.com/api/v0"),
    SUPERFRETE_TOKEN: z.string().trim().min(1).optional(),
    SUPERFRETE_ORIGIN_CEP: z
      .string()
      .trim()
      .regex(/^\d{8}$/)
      .optional(),
    SUPERFRETE_SERVICES: z.string().trim().min(1).default("1,2"),
    PAYMENT_PROVIDER: z.enum(["disabled", "mercado-pago"]).default("disabled"),
    MERCADO_PAGO_ACCESS_TOKEN: z.string().min(1).optional(),
    MERCADO_PAGO_WEBHOOK_SECRET: z.string().min(16).optional(),
    MERCADO_PAGO_API_URL: z
      .string()
      .url()
      .default("https://api.mercadopago.com"),
    PUBLIC_BACKEND_URL: z.string().url().optional(),
    PUBLIC_FRONTEND_URL: z.string().url().optional(),
    CUSTOMER_SESSION_HOURS: z.coerce
      .number()
      .int()
      .min(1)
      .max(720)
      .default(168),
    ADMIN_SESSION_HOURS: z.coerce.number().int().min(1).max(24).default(8),
    EMAIL_PROVIDER: z.enum(["disabled", "http"]).default("disabled"),
    EMAIL_WEBHOOK_URL: z.string().url().optional(),
    EMAIL_WEBHOOK_TOKEN: z.string().min(1).optional(),
    STORAGE_PROVIDER: z
      .enum(["disabled", "local", "http", "cloudinary"])
      .default("disabled"),
    STORAGE_HTTP_URL: z.string().url().optional(),
    STORAGE_HTTP_TOKEN: z.string().min(1).optional(),
    STORAGE_PUBLIC_URL: z.string().url().optional(),
    CLOUDINARY_CLOUD_NAME: z.string().trim().min(1).optional(),
    CLOUDINARY_API_KEY: z.string().trim().min(1).optional(),
    CLOUDINARY_API_SECRET: z.string().trim().min(1).optional(),
    CLOUDINARY_FOLDER: z
      .string()
      .trim()
      .min(1)
      .default("brinco-de-princesa/products"),
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV === "production" && !value.DATABASE_URL) {
      context.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "obrigatória em produção",
      });
    }
    if (value.NODE_ENV === "production" && value.PAYMENT_PROVIDER !== "mercado-pago") {
      context.addIssue({
        code: "custom",
        path: ["PAYMENT_PROVIDER"],
        message: "deve ser 'mercado-pago' em produção",
      });
    }
    if (value.NODE_ENV === "production" && value.SHIPPING_PROVIDER !== "superfrete") {
      context.addIssue({
        code: "custom",
        path: ["SHIPPING_PROVIDER"],
        message: "deve ser 'superfrete' em produção",
      });
    }
    const requireField = (enabled, field, message) => {
      if (enabled && !value[field])
        context.addIssue({ code: "custom", path: [field], message });
    };
    const superFrete = value.SHIPPING_PROVIDER === "superfrete";
    requireField(superFrete, "SUPERFRETE_TOKEN", "obrigatória para SuperFrete");
    requireField(superFrete, "SUPERFRETE_ORIGIN_CEP", "obrigatória para SuperFrete");
    const mercadoPago = value.PAYMENT_PROVIDER === "mercado-pago";
    requireField(
      mercadoPago,
      "MERCADO_PAGO_ACCESS_TOKEN",
      "obrigatória para Mercado Pago",
    );
    requireField(
      mercadoPago,
      "MERCADO_PAGO_WEBHOOK_SECRET",
      "obrigatória para Mercado Pago",
    );
    requireField(
      mercadoPago,
      "PUBLIC_BACKEND_URL",
      "obrigatória para Mercado Pago",
    );
    requireField(
      mercadoPago,
      "PUBLIC_FRONTEND_URL",
      "obrigatória para Mercado Pago",
    );
    requireField(
      value.EMAIL_PROVIDER === "http",
      "EMAIL_WEBHOOK_URL",
      "obrigatória para e-mail HTTP",
    );
    requireField(
      value.EMAIL_PROVIDER === "http",
      "EMAIL_WEBHOOK_TOKEN",
      "obrigatória para e-mail HTTP",
    );
    requireField(
      value.STORAGE_PROVIDER === "http",
      "STORAGE_HTTP_URL",
      "obrigatória para storage HTTP",
    );
    requireField(
      value.STORAGE_PROVIDER === "http",
      "STORAGE_HTTP_TOKEN",
      "obrigatória para storage HTTP",
    );
    requireField(
      value.STORAGE_PROVIDER === "http",
      "STORAGE_PUBLIC_URL",
      "obrigatória para storage HTTP",
    );
    const cloudinary = value.STORAGE_PROVIDER === "cloudinary";
    requireField(cloudinary, "CLOUDINARY_CLOUD_NAME", "obrigatória para Cloudinary");
    requireField(cloudinary, "CLOUDINARY_API_KEY", "obrigatória para Cloudinary");
    requireField(cloudinary, "CLOUDINARY_API_SECRET", "obrigatória para Cloudinary");
    if (value.NODE_ENV === "production" && value.STORAGE_PROVIDER !== "cloudinary")
      context.addIssue({
        code: "custom",
        path: ["STORAGE_PROVIDER"],
        message: "deve ser 'cloudinary' em produção",
      });
  });

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const fields = parsed.error.issues
    .map((issue) => issue.path.join("."))
    .join(", ");
  throw new Error(`Configuração de ambiente inválida: ${fields}`);
}

export const env = {
  ...parsed.data,
  frontendOrigins: parsed.data.FRONTEND_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};
