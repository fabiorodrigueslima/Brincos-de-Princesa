import { createContext, useContext } from 'react';

export const StorefrontContext = createContext({ mode: null, loading: true });
export const useStorefront = () => useContext(StorefrontContext);
