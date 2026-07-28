import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles/index.css'
import { Toaster } from 'react-hot-toast'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: '#0e1424',
          color: '#fff',
          border: '1px solid #334155',
          borderRadius: '12px',
        },
      }}
    />
  </StrictMode>,
)
