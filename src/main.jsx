import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { Toaster } from 'react-hot-toast'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1b1c1c',
            color: '#faf9f9',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#ff6b00', secondary: '#fff' } },
        }}
      />
    </AuthProvider>
  </StrictMode>,
)
