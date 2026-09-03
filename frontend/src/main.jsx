import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { AppErrorBoundary } from './components/common/AppErrorBoundary.jsx'
import { CartProvider } from './context/CartContext.jsx'
import { CustomerAuthProvider } from './context/customerAuthContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary>
      <CustomerAuthProvider><CartProvider><App /></CartProvider></CustomerAuthProvider>
    </AppErrorBoundary>
  </StrictMode>,
)
