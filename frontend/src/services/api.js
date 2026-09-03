const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api/v1";

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function request(
  path,
  { signal, method = "GET", body, headers = {} } = {},
) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal,
    credentials: "include",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      payload?.error?.message ?? "Não foi possível acessar o catálogo.",
      response.status,
      payload?.error?.code,
    );
  }
  return payload;
}

export function adminLogin(credentials, signal) {
  return request("/admin/auth/login", {
    signal,
    method: "POST",
    body: credentials,
  });
}
export function adminMe(signal) {
  return request("/admin/auth/me", { signal });
}
export function adminLogout(csrfToken, signal) {
  return request("/admin/auth/logout", {
    signal,
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
  });
}
export function getAdminResource(resource, params = {}, signal) {
  const query = new URLSearchParams(params);
  return request(`/admin/${resource}${query.size ? `?${query}` : ""}`, {
    signal,
  });
}
export function mutateAdminResource(path, method, body, csrfToken, signal) {
  return request(`/admin/${path}`, {
    signal,
    method,
    body,
    headers: { "X-CSRF-Token": csrfToken },
  });
}

export function validateCart(items, signal) {
  return request("/cart/validate", { signal, method: "POST", body: { items } });
}

export function getCategories(signal) {
  return request("/catalog/categories", { signal });
}

export function getCollections(signal) {
  return request("/catalog/collections", { signal });
}

export function getCollection(slug, signal) {
  return request(`/catalog/collections/${encodeURIComponent(slug)}`, {
    signal,
  });
}

export function getProducts(filters, signal) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== "" && value !== undefined) params.set(key, value);
  }
  return request(`/products?${params}`, { signal });
}

export function getProduct(slug, signal) {
  return request(`/products/${encodeURIComponent(slug)}`, { signal });
}

export function lookupPostalCode(postalCode, signal) {
  return request(`/checkout/postal-code/${encodeURIComponent(postalCode)}`, {
    signal,
  });
}

export function quoteCheckout(payload, signal) {
  return request("/checkout/quote", { signal, method: "POST", body: payload });
}

export function createOrder(payload, idempotencyKey, signal) {
  return request("/orders", {
    signal,
    method: "POST",
    body: payload,
    headers: { "Idempotency-Key": idempotencyKey },
  });
}

export function createPayment(
  code,
  accessToken,
  method,
  idempotencyKey,
  signal,
) {
  return request(`/orders/${encodeURIComponent(code)}/payments`, {
    signal,
    method: "POST",
    body: { method },
    headers: {
      "X-Order-Token": accessToken,
      "Idempotency-Key": idempotencyKey,
    },
  });
}

export function getOrder(code, accessToken, signal) {
  return request(`/orders/${encodeURIComponent(code)}`, {
    signal,
    headers: { "X-Order-Token": accessToken },
  });
}

export function getCourses(filters = {}, signal) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters))
    if (value !== "" && value !== undefined) params.set(key, value);
  return request(`/courses?${params}`, { signal });
}

export function getCourse(slug, signal) {
  return request(`/courses/${encodeURIComponent(slug)}`, { signal });
}

export function customerRegister(credentials, signal) {
  return request("/customers/auth/register", {
    signal,
    method: "POST",
    body: credentials,
  });
}

export function customerLogin(credentials, signal) {
  return request("/customers/auth/login", {
    signal,
    method: "POST",
    body: credentials,
  });
}

export function customerForgot(credentials, signal) {
  return request("/customers/auth/forgot", {
    signal,
    method: "POST",
    body: credentials,
  });
}

export function customerReset(credentials, signal) {
  return request("/customers/auth/reset", {
    signal,
    method: "POST",
    body: credentials,
  });
}

export function customerMe(signal) {
  return request("/customers/me", { signal });
}

export function customerLogout(csrfToken, signal) {
  return request("/customers/auth/logout", {
    signal,
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
  });
}

export function customerUpdate(profile, csrfToken, signal) {
  return request("/customers/profile", {
    signal,
    method: "PUT",
    body: profile,
    headers: { "X-CSRF-Token": csrfToken },
  });
}

export function customerOrders(signal) {
  return request("/customers/orders", { signal });
}

export function customerAddAddress(address, csrfToken, signal) {
  return request("/customers/addresses", {
    signal,
    method: "POST",
    body: address,
    headers: { "X-CSRF-Token": csrfToken },
  });
}

export function customerUpdateAddress(id, address, csrfToken, signal) {
  return request(`/customers/addresses/${encodeURIComponent(id)}`, {
    signal,
    method: "PUT",
    body: address,
    headers: { "X-CSRF-Token": csrfToken },
  });
}

export function customerDeleteAddress(id, csrfToken, signal) {
  return request(`/customers/addresses/${encodeURIComponent(id)}`, {
    signal,
    method: "DELETE",
    headers: { "X-CSRF-Token": csrfToken },
  });
}

export function customerPrivacyRequest(type, csrfToken, signal) {
  return request("/customers/privacy-requests", {
    signal,
    method: "POST",
    body: { type },
    headers: { "X-CSRF-Token": csrfToken },
  });
}
