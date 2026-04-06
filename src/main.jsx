import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  // OPT: enable offline/return-visit cache for large 3D assets.
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.error('Service worker registration failed', err)
    })
  })
}

if (!import.meta.env.PROD && 'serviceWorker' in navigator) {
  // OPT: avoid stale model caches from previous prod sessions while developing.
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations()
      .then(registrations => Promise.all(registrations.map(r => r.unregister())))
      .catch(err => {
        console.warn('Service worker cleanup failed', err)
      })
  })
}
