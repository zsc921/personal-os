// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import OAuthCallback from './components/OAuthCallback'

const isOAuthCallback = window.location.pathname === '/oauth/callback'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isOAuthCallback ? <OAuthCallback /> : <App />}
  </StrictMode>
)
