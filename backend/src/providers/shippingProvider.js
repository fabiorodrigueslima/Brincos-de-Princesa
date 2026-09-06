import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

const cents = (value) => Math.round(Number(value) * 100);
const decimal = (value) => `${Math.floor(value / 100)}.${String(value % 100).padStart(2, "0")}`;
const normalizePostalCode = (postalCode) => String(postalCode ?? "").replace(/\D/g, "");

export function createConfigurableShippingProvider(config = env) {
  const allowedStates = new Set(String(config.SHIPPING_ALLOWED_STATES || "").split(",").map((state) => state.trim().toUpperCase()).filter(Boolean));
  return { async quote({ postalCode, state, subtotal }) {
    const rawPostalCode = normalizePostalCode(postalCode);
    if (!/^\d{8}$/.test(rawPostalCode)) throw new AppError(400, "POSTAL_CODE_INVALID", "CEP inválido.");
    if (allowedStates.size && !allowedStates.has(String(state).trim().toUpperCase())) throw new AppError(422, "SHIPPING_UNAVAILABLE", "Entrega indisponível para esta região.");
    const freeAbove = config.SHIPPING_FREE_ABOVE ? cents(config.SHIPPING_FREE_ABOVE) : null;
    const free = freeAbove !== null && cents(subtotal) >= freeAbove;
    const options = [{ id: "fixed", service: free ? "Frete grátis" : "Entrega padrão", carrier: null, price: free ? "0.00" : decimal(cents(config.SHIPPING_FIXED_PRICE)), estimatedDays: Number(config.SHIPPING_ESTIMATED_DAYS) }];
    if (config.SHIPPING_LOCAL_PICKUP) options.push({ id: "local-pickup", service: config.SHIPPING_LOCAL_PICKUP_LABEL, carrier: null, price: "0.00", estimatedDays: 0 });
    return options;
  } };
}

export function createSuperFreteShippingProvider(config = env) {
  const services = String(config.SUPERFRETE_SERVICES || "")
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean);

  const ensureConfig = () => {
    if (!config.SUPERFRETE_API_BASE_URL || !config.SUPERFRETE_TOKEN || !config.SUPERFRETE_ORIGIN_CEP || !services.length) {
      throw new AppError(503, "SHIPPING_PROVIDER_NOT_CONFIGURED", "A integração da SuperFrete não está configurada no ambiente.");
    }
  };

  return {
    name: "superfrete",
    async quote({ postalCode, state, items = [] }) {
      ensureConfig();
      const normalizedPostalCode = normalizePostalCode(postalCode);
      if (!/^\d{8}$/.test(normalizedPostalCode)) throw new AppError(400, "POSTAL_CODE_INVALID", "CEP inválido.");
      if (state && !/^[A-Z]{2}$/.test(String(state).trim().toUpperCase())) throw new AppError(422, "SHIPPING_UNAVAILABLE", "Estado inválido para o frete.");
      const physicalItems = items.filter((item) => item.quantity > 0);
      if (physicalItems.some((item) => !item.weightGrams || !item.dimensionsCm)) {
        throw new AppError(422, "SHIPPING_PACKAGE_DATA_MISSING", "Informe peso e dimensões dos produtos para calcular o frete.");
      }
      const packageData = physicalItems.reduce((packageValue, item) => ({
        weight: packageValue.weight + (Number(item.weightGrams) * item.quantity) / 1000,
        width: Math.max(packageValue.width, Number(item.dimensionsCm.width)),
        height: packageValue.height + Number(item.dimensionsCm.height) * item.quantity,
        length: Math.max(packageValue.length, Number(item.dimensionsCm.length)),
      }), { weight: 0, width: 0, height: 0, length: 0 });
      const endpoint = new URL("calculator", `${config.SUPERFRETE_API_BASE_URL.replace(/\/$/, "")}/`).toString();
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.SUPERFRETE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: { postal_code: config.SUPERFRETE_ORIGIN_CEP },
          to: { postal_code: normalizedPostalCode },
          services: services.join(","),
          package: packageData,
        }),
        signal: AbortSignal.timeout(config.EXTERNAL_REQUEST_TIMEOUT_MS ?? 4000),
      });
      if (!response.ok) {
        const errorMessage = response.status === 429 ? "A cotação da SuperFrete foi temporariamente recusada." : "A cotação da SuperFrete não pôde ser concluída.";
        throw new AppError(response.status === 429 ? 429 : 502, "SUPERFRETE_QUOTE_ERROR", errorMessage);
      }
      const payload = await response.json().catch(() => ({}));
      const options = Array.isArray(payload) ? payload : Array.isArray(payload.options) ? payload.options : [];
      if (!options.length) throw new AppError(502, "SUPERFRETE_QUOTE_EMPTY", "A SuperFrete não retornou opções válidas.");
      return options.map((option) => ({
        id: String(option.id ?? option.service ?? option.code),
        service: String(option.name ?? option.service ?? "SuperFrete"),
        carrier: String(option.company?.name ?? option.carrier ?? "SuperFrete"),
        price: String(option.price ?? option.value ?? "0.00"),
        estimatedDays: Number(option.delivery_time ?? option.estimatedDays ?? option.deliveryDays ?? 0),
      }));
    },
  };
}

const disabled = {
  async quote() {
    throw new AppError(
      503,
      "SHIPPING_NOT_CONFIGURED",
      "A cotação de frete depende da configuração da transportadora.",
    );
  },
};

export const shippingProvider = env.SHIPPING_PROVIDER === "configurable"
  ? createConfigurableShippingProvider(env)
  : env.SHIPPING_PROVIDER === "superfrete"
    ? createSuperFreteShippingProvider(env)
    : disabled;
