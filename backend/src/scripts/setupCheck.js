import { env } from "../config/env.js";

const isUrl = (value) => {
  try {
    return Boolean(new URL(value));
  } catch {
    return false;
  }
};

const checks = [
  ["Database", Boolean(env.DATABASE_URL), "required"],
  ["Frontend URL", isUrl(env.PUBLIC_FRONTEND_URL), "required"],
  ["Backend URL", isUrl(env.PUBLIC_BACKEND_URL), "required"],
  [
    "Shipping provider",
    env.NODE_ENV !== "production" || env.SHIPPING_PROVIDER === "superfrete",
    env.NODE_ENV === "production" ? "required" : "optional",
  ],
  [
    "SuperFrete token",
    env.NODE_ENV !== "production" ||
      env.SHIPPING_PROVIDER !== "superfrete" ||
      Boolean(env.SUPERFRETE_TOKEN),
    env.NODE_ENV === "production" ? "required" : "optional",
  ],
  [
    "SuperFrete origin CEP",
    env.NODE_ENV !== "production" ||
      env.SHIPPING_PROVIDER !== "superfrete" ||
      /^\d{8}$/.test(String(env.SUPERFRETE_ORIGIN_CEP || "")),
    env.NODE_ENV === "production" ? "required" : "optional",
  ],
  [
    "SuperFrete services",
    env.NODE_ENV !== "production" ||
      env.SHIPPING_PROVIDER !== "superfrete" ||
      Boolean(env.SUPERFRETE_SERVICES),
    env.NODE_ENV === "production" ? "required" : "optional",
  ],
  [
    "Mercado Pago Access Token",
    env.NODE_ENV !== "production" ||
      (env.PAYMENT_PROVIDER === "mercado-pago" &&
        Boolean(env.MERCADO_PAGO_ACCESS_TOKEN)),
    env.NODE_ENV === "production" ? "required" : "optional",
  ],
  [
    "Mercado Pago Webhook Secret",
    env.NODE_ENV !== "production" ||
      (env.PAYMENT_PROVIDER === "mercado-pago" &&
        Boolean(env.MERCADO_PAGO_WEBHOOK_SECRET)),
    env.NODE_ENV === "production" ? "required" : "optional",
  ],
  [
    "Email provider",
    Boolean(env.EMAIL_PROVIDER && env.EMAIL_PROVIDER !== "disabled"),
    "optional",
  ],
  [
    "Storage provider",
    env.STORAGE_PROVIDER === "cloudinary" ||
      (env.NODE_ENV !== "production" && env.STORAGE_PROVIDER !== "disabled"),
    env.NODE_ENV === "production" ? "required" : "optional",
  ],
];

for (const [name, ok, level] of checks)
  console.log(`${ok ? "✅" : level === "optional" ? "⚠️" : "❌"} ${name}`);
if (checks.some(([, ok, level]) => !ok && level === "required"))
  process.exitCode = 1;
