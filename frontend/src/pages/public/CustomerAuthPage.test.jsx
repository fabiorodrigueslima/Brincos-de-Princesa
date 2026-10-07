import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { CustomerAuthPage } from './CustomerAuthPage.jsx'

globalThis.React = React

describe('customer password forms', () => {
  it.each(['login', 'register', 'reset'])('%s uses an eight-character minimum', mode => {
    const html = renderToStaticMarkup(<MemoryRouter><CustomerAuthPage mode={mode} /></MemoryRouter>)
    expect(html).toMatch(/type="password"[^>]*minLength="8"/)
    expect(html).not.toContain('minLength="12"')
  })
  it('recovery requests only the email address', () => {
    const html = renderToStaticMarkup(<MemoryRouter><CustomerAuthPage mode="forgot" /></MemoryRouter>)
    expect(html).toContain('type="email"')
    expect(html).not.toContain('type="password"')
  })
})
