import { describe, expect, it, vi } from 'vitest'
import { hashPassword, verifyPassword } from '../src/security/password.js'
import { createAdminAuthService } from '../src/services/adminAuthService.js'

describe('administrative authentication', () => {
  it('stores passwords with salted memory-hard scrypt, never plaintext or plain SHA-256', async () => { const hash=await hashPassword('correct horse battery staple');expect(hash).toMatch(/^scrypt\$/);expect(hash).not.toContain('correct horse');expect(await verifyPassword('correct horse battery staple',hash)).toBe(true);expect(await verifyPassword('wrong password',hash)).toBe(false) })
  it('returns the same generic error for missing user and invalid password', async () => {
    for(const user of [null,{id:1,ativo:true,password_hash:await hashPassword('valid password 123')}]){const repository={findByEmail:async()=>user,recordFailure:vi.fn(),audit:vi.fn()};await expect(createAdminAuthService(repository).login({email:'x@example.com',password:'incorrect password',requestId:'request-1'})).rejects.toMatchObject({code:'INVALID_CREDENTIALS',message:'Credenciais inválidas.'})}
  })
  it('creates hashed session and csrf secrets after a valid login', async () => { const repository={findByEmail:async()=>({id:1,email:'owner@example.com',nome:'Owner',papel:'OWNER',ativo:true,password_hash:await hashPassword('valid password 123')}),createSession:vi.fn(),recordSuccess:vi.fn(),audit:vi.fn()};const result=await createAdminAuthService(repository).login({email:'owner@example.com',password:'valid password 123',requestId:'request-1'});expect(repository.createSession).toHaveBeenCalledWith(1,expect.stringMatching(/^[a-f0-9]{64}$/),expect.stringMatching(/^[a-f0-9]{64}$/),expect.any(String),expect.any(String),8);expect(result.user.role).toBe('OWNER') })
})
