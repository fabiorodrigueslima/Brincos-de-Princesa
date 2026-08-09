const localHosts = new Set(['localhost', '127.0.0.1', '::1'])

export function databaseName(url) {
  return decodeURIComponent(url.pathname.replace(/^\//, ''))
}

function assertSeparateCredentials(runtimeUrl, adminUrl) {
  if (runtimeUrl.username === adminUrl.username || runtimeUrl.password === adminUrl.password) {
    throw new Error('Runtime e administração do PostgreSQL devem usar credenciais diferentes')
  }
}

export function resolveAdminConnection({ target = 'development' } = {}) {
  const runtimeVariable = target === 'test' ? 'TEST_DATABASE_URL' : 'DATABASE_URL'
  const explicitAdminVariable = target === 'test' ? 'TEST_DATABASE_ADMIN_URL' : 'DATABASE_ADMIN_URL'
  const runtimeValue = process.env[runtimeVariable]

  if (!runtimeValue) throw new Error(`Defina ${runtimeVariable} para identificar o banco de destino`)

  const runtimeUrl = new URL(runtimeValue)
  let adminUrl

  if (process.env[explicitAdminVariable]) {
    adminUrl = new URL(process.env[explicitAdminVariable])
  } else if (target === 'development' && process.env.NODE_ENV !== 'production' && process.env.TEST_DATABASE_ADMIN_URL) {
    adminUrl = new URL(process.env.TEST_DATABASE_ADMIN_URL)
    adminUrl.pathname = runtimeUrl.pathname
  } else {
    throw new Error(`Defina ${explicitAdminVariable} com uma credencial administrativa separada`)
  }

  if (databaseName(adminUrl) !== databaseName(runtimeUrl)) {
    throw new Error(`${explicitAdminVariable} deve apontar para o mesmo banco de ${runtimeVariable}`)
  }
  if (adminUrl.hostname !== runtimeUrl.hostname || adminUrl.port !== runtimeUrl.port) {
    throw new Error('Runtime e administração devem apontar para a mesma instância PostgreSQL')
  }

  assertSeparateCredentials(runtimeUrl, adminUrl)

  if (!localHosts.has(adminUrl.hostname) && process.env.ALLOW_REMOTE_MIGRATION_DATABASE !== 'true') {
    throw new Error('Banco remoto exige ALLOW_REMOTE_MIGRATION_DATABASE=true')
  }
  if (process.env.NODE_ENV === 'production' && !process.env[explicitAdminVariable]) {
    throw new Error(`${explicitAdminVariable} explícita é obrigatória em produção`)
  }

  return { adminUrl, runtimeUrl }
}

export function assertDevelopmentSeedTarget(adminUrl) {
  const name = databaseName(adminUrl)

  if (process.env.NODE_ENV === 'production') {
    throw new Error('O seed de desenvolvimento é proibido em NODE_ENV=production')
  }
  if (name.endsWith('_test')) {
    throw new Error('O seed de desenvolvimento não pode usar o banco de testes')
  }
  if (name !== 'brinco_de_princesa') {
    throw new Error('O seed de desenvolvimento só pode usar brinco_de_princesa')
  }
}
