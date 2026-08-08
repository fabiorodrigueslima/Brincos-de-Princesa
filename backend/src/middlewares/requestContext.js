import { randomUUID } from 'node:crypto'

export function requestContext(req, res, next) {
  const suppliedId = req.get('X-Request-Id')
  const requestId = suppliedId && /^[a-zA-Z0-9_-]{8,64}$/.test(suppliedId) ? suppliedId : randomUUID()
  req.requestId = requestId
  res.setHeader('X-Request-Id', requestId)
  next()
}
