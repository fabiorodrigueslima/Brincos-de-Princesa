import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)
const KEY_LENGTH = 64

export async function hashPassword(password) {
  const salt = randomBytes(16)
  const derived = await scrypt(password, salt, KEY_LENGTH, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 })
  return `scrypt$32768$8$1$${salt.toString('base64url')}$${derived.toString('base64url')}`
}

export async function verifyPassword(password, encoded) {
  try {
    const [algorithm, n, r, p, salt, expected] = encoded.split('$')
    if (algorithm !== 'scrypt') return false
    const expectedBuffer = Buffer.from(expected, 'base64url')
    const actual = await scrypt(password, Buffer.from(salt, 'base64url'), expectedBuffer.length, { N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024 })
    return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer)
  } catch { return false }
}
