import { closeDatabase } from "../config/database.js";
import { orderRepository } from "../repositories/orderRepository.js";

try {
  const startedAt = Date.now();
  const result = await orderRepository.expireReservations();
  console.log(
    JSON.stringify({
      event: "EXPIRE_ORDERS_COMPLETED",
      expired: result.expired,
      durationMs: Date.now() - startedAt,
    }),
  );
} catch (error) {
  console.error(
    JSON.stringify({
      event: "EXPIRE_ORDERS_FAILED",
      error: error.code ?? error.name,
    }),
  );
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
