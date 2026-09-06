import { env } from "../config/env.js";

export function errorHandler(error, req, res, _next) {
  void _next
  const isCorsError = error.message === 'Origem não autorizada'
  const isDatabaseUnavailable = error.message === 'DATABASE_NOT_CONFIGURED'
  const status = error.status ?? (isCorsError ? 403 : isDatabaseUnavailable ? 503 : 500)
  const code = error.code ?? (isCorsError ? 'ORIGIN_NOT_ALLOWED' : isDatabaseUnavailable ? 'SERVICE_UNAVAILABLE' : 'INTERNAL_ERROR')
  const message = error.status
    ? error.message
    : isCorsError
      ? 'Origem não autorizada.'
      : isDatabaseUnavailable
        ? 'Catálogo temporariamente indisponível.'
        : 'Não foi possível concluir a solicitação.'

  if (status === 500) {
    console.error({
      event: 'UNHANDLED_ERROR',
      requestId: req.requestId,
      errorName: error.name,
      ...(env.NODE_ENV === 'development'
        ? { errorMessage: error.message, errorStack: error.stack }
        : {}),
    })
  }

  res.status(status).json({
    error: {
      code,
      message,
      requestId: req.requestId,
      ...(error.details ? { details: error.details } : {}),
    },
  })
}
