import { useEffect, useState } from 'react';
import { StorefrontContext } from './storefrontContext.js';
import { getStorefront } from '../services/api.js';

export function StorefrontProvider({ children }) {
  const [state, setState] = useState({ mode: null, loading: true });
  useEffect(() => {
    const controller = new AbortController();
    getStorefront(controller.signal).then(({ data }) => {
      if (!controller.signal.aborted) setState({ mode: data.mode === 'commerce' ? 'commerce' : 'catalog', loading: false });
    }).catch(() => {
      if (!controller.signal.aborted) setState({ mode: null, loading: false });
    });
    return () => controller.abort();
  }, []);
  return <StorefrontContext.Provider value={state}>{children}</StorefrontContext.Provider>;
}
