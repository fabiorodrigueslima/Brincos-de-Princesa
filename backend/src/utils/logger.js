const allowed = {
  REQUEST_COMPLETED: ["requestId", "method", "path", "status", "durationMs"],
  PAYMENT_WEBHOOK_REJECTED: ["requestId", "provider", "code"],
  EXPIRE_ORDERS_COMPLETED: ["expired", "durationMs"],
  ORDER_CREATED: ["requestId", "code"],
  PAYMENT_CREATED: ["requestId", "code", "provider"],
};
export function log(event, fields = {}) {
  const safe = { event, timestamp: new Date().toISOString() };
  for (const key of allowed[event] ?? [])
    if (fields[key] != null) safe[key] = fields[key];
  console.log(JSON.stringify(safe));
}
