import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { StorefrontContext } from '../../context/storefrontContext.js';
import { CommerceGate } from './CommerceGate.jsx';

globalThis.React = React;
const render = mode => renderToStaticMarkup(<MemoryRouter><StorefrontContext.Provider value={{ mode, loading: false }}><CommerceGate><form>Finalizar compra</form></CommerceGate></StorefrontContext.Provider></MemoryRouter>);
describe('catalog route protection', () => {
  it.each(['catalog', null])('does not render purchasing forms for %s', mode => {
    const html = render(mode);
    expect(html).not.toContain('Finalizar compra');
    expect(html).toContain('Ver catálogo');
  });
  it('preserves purchase pages in commerce mode', () => {
    expect(render('commerce')).toContain('Finalizar compra');
  });
});
