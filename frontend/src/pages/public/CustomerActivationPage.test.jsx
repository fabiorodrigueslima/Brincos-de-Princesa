import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { CustomerActivationPage } from './CustomerActivationPage.jsx'

globalThis.React = React
const render = path => renderToStaticMarkup(<MemoryRouter initialEntries={[path]}><CustomerActivationPage /></MemoryRouter>)

describe('account activation page', () => {
  it('offers email proof separately from recovery without collecting a password before the link', () => {
    const html = render('/ativar-conta')
    expect(html).toContain('type="email"')
    expect(html).not.toContain('type="password"')
    expect(html).toContain('href="/recuperar-senha"')
  })
  it('requires a new password on the link and tells the user to log in afterwards', () => {
    const html = render('/ativar-conta?token=synthetic-proof')
    expect(html).toContain('type="password"')
    expect(html).toContain('minLength="8"')
    expect(html).toContain('maxLength="200"')
    expect(html).not.toContain('type="email"')
    expect(html).not.toContain('synthetic-proof')
    expect(html).toContain('entre novamente')
  })
})
