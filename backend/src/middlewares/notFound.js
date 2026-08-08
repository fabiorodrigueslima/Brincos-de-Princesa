export function notFound(req, res) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Recurso não encontrado.',
      requestId: req.requestId,
    },
  })
}
