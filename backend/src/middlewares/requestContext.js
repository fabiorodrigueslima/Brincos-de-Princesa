import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import { log } from "../utils/logger.js";

export function requestContext(req, res, next) {
  const suppliedId = req.get("X-Request-Id");
  const requestId =
    suppliedId && /^[a-zA-Z0-9_-]{8,64}$/.test(suppliedId)
      ? suppliedId
      : randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  if (env.NODE_ENV !== "test") {
    const started = Date.now();
    res.on("finish", () =>
      log("REQUEST_COMPLETED", {
        requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Date.now() - started,
      }),
    );
  }
  next();
}
