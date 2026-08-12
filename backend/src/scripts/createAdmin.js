import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import pg from 'pg'
import { resolveAdminConnection } from '../database/adminConnection.js'
import { hashPassword } from '../security/password.js'

const { Client } = pg
const terminal = createInterface({ input: stdin, output: stdout })
try {
  const email = (await terminal.question('E-mail: ')).trim().toLowerCase()
  const name = (await terminal.question('Nome: ')).trim()
  const password = await terminal.question('Senha (mínimo 12 caracteres): ')
  if (!/^\S+@\S+\.\S+$/.test(email) || name.length < 2 || password.length < 12) throw new Error('Dados inválidos.')
  const { adminUrl } = resolveAdminConnection()
  const client = new Client({ connectionString: adminUrl.toString() }); await client.connect()
  try { await client.query({ text:`INSERT INTO app.usuarios_admin(email,nome,password_hash,papel) VALUES($1,$2,$3,'OWNER')`,values:[email,name,await hashPassword(password)] }); stdout.write('Administrador criado.\n') } finally { await client.end() }
} finally { terminal.close() }
