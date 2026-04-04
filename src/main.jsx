import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Workbox } from 'workbox-window'
import './index.css'
import App from './App.jsx'

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return

  const wb = new Workbox('/sw.js')

  try {
    await wb.register()
  } catch {
    // Dev sans SW ou build sans fichier généré
  }
}

window.addEventListener('load', () => {
  registerServiceWorker()
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
