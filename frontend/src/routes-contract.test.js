import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const appSource = readFileSync(new URL('./App.jsx', import.meta.url), 'utf8')
const orderSource = readFileSync(new URL('./pages/public/OrderPage.jsx', import.meta.url), 'utf8')
const adminSource = readFileSync(new URL('./pages/admin/AdminPage.jsx', import.meta.url), 'utf8')

describe('application route contracts', () => {
  it('mounts the protected order return route and admin entry route', () => {
    expect(appSource).toContain('path="pedido/:code"')
    expect(appSource).toContain('path="admin"')
    expect(appSource).toContain('element={<OrderPage />}')
    expect(appSource).toContain('element={<AdminPage />}')
  })

  it('loads order state from the backend and ignores payment query status', () => {
    expect(orderSource).toContain('getOrder(code, accessToken')
    expect(orderSource).not.toContain('useSearchParams')
    expect(orderSource).not.toMatch(/searchParams.*status|status.*searchParams/)
  })

  it('keeps admin access behind the existing session and recognized roles', () => {
    expect(adminSource).toContain('adminMe()')
    expect(adminSource).toContain("['OWNER','MANAGER','FULFILLMENT'].includes(session.user.role)")
  })
})