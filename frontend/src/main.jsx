import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { AppErrorBoundary } from './components/common/AppErrorBoundary.jsx'
import { CartProvider } from './context/CartContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary>
      <CartProvider><App /></CartProvider>
    </AppErrorBoundary>
  </StrictMode>,
)
