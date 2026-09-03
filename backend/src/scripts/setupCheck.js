const isUrl = (value) => {
  try {
    return Boolean(new URL(value));
  } catch {
    return false;
  }
};
const checks = [
  ["Database", Boolean(process.env.DATABASE_URL), "required"],
  ["Frontend URL", isUrl(process.env.PUBLIC_FRONTEND_URL), "required"],
  ["Backend URL", isUrl(process.env.PUBLIC_BACKEND_URL), "required"],
  [
    "Shipping provider",
    Boolean(
      process.env.SHIPPING_PROVIDER &&
      process.env.SHIPPING_PROVIDER !== "disabled",
    ),
    "required",
  ],
  [
    "Mercado Pago Access Token",
    process.env.PAYMENT_PROVIDER !== "mercado-pago" ||
      Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN),
    "conditional",
  ],
  [
    "Mercado Pago Webhook Secret",
    process.env.PAYMENT_PROVIDER !== "mercado-pago" ||
      Boolean(process.env.MERCADO_PAGO_WEBHOOK_SECRET),
    "conditional",
  ],
  [
    "Email provider",
    Boolean(
      process.env.EMAIL_PROVIDER && process.env.EMAIL_PROVIDER !== "disabled",
    ),
    process.env.NODE_ENV === "production" ? "required" : "optional",
  ],
  [
    "Storage provider",
    Boolean(
      process.env.STORAGE_PROVIDER &&
      process.env.STORAGE_PROVIDER !== "disabled",
    ),
    process.env.NODE_ENV === "production" ? "required" : "optional",
  ],
];
for (const [name, ok, level] of checks)
  console.log(`${ok ? "✅" : level === "optional" ? "⚠️" : "❌"} ${name}`);
if (checks.some(([, ok, level]) => !ok && level === "required"))
  process.exitCode = 1;
