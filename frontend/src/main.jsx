import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { AppErrorBoundary } from './components/common/AppErrorBoundary.jsx'
import { CartProvider } from './context/CartContext.jsx'
import { CustomerAuthProvider } from './context/customerAuthContext.jsx'
import { StorefrontProvider } from './context/StorefrontProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary>
      <StorefrontProvider><CustomerAuthProvider><CartProvider><App /></CartProvider></CustomerAuthProvider></StorefrontProvider>
    </AppErrorBoundary>
  </StrictMode>,
)
