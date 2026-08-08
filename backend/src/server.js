import { app } from './app.js'
import { closeDatabase } from './config/database.js'
import { env } from './config/env.js'

const server = app.listen(env.PORT, () => {
  console.log(`API Brinco de Princesa disponível na porta ${env.PORT}`)
})

let shuttingDown = false

function shutdown(signal) {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`Encerrando API após ${signal}`)
  server.close(async (error) => {
    await closeDatabase()
    if (error) {
      console.error({ event: 'SHUTDOWN_ERROR', errorName: error.name })
      process.exitCode = 1
    }
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
