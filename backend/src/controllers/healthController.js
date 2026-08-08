import { checkDatabase } from '../config/database.js'

export function getLiveness(_req, res) {
  res.status(200).json({ status: 'ok' })
}

export async function getReadiness(_req, res) {
  const databaseReady = await checkDatabase()
  const status = databaseReady ? 200 : 503

  res.status(status).json({
    status: databaseReady ? 'ready' : 'not_ready',
    checks: { api: 'ok', database: databaseReady ? 'ok' : 'unavailable' },
  })
}
