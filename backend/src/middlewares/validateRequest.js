import { AppError } from '../utils/AppError.js'

export function validateRequest(schema, source) {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source])
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }))
      return next(new AppError(400, 'VALIDATION_ERROR', 'Parâmetros inválidos.', details))
    }

    req.validated ??= {}
    req.validated[source] = result.data
    return next()
  }
}
