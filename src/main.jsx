import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { supabase } from './lib/supabase'
import { Capacitor } from '@capacitor/core'

// Keeps the app in sync with whatever the developer last deployed.
//
//  - Production: registers /sw.js (which carries a build id stamped at build time) and
//    silently reloads the page whenever a newer worker takes control, so users see the
//    new version without doing anything.
//  - Development: removes any worker left over from an earlier session so the dev
//    server is never masked by a cached copy of your source files.
function setupServiceWorker() {
  if (!('serviceWorker' in navigator)) return

  if (!import.meta.env.PROD) {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        if (!registrations.length) return
        return Promise.all(registrations.map((r) => r.unregister())).then((results) => {
          if (window.caches) {
            window.caches
              .keys()
              .then((keys) => keys.filter((k) => k.startsWith('jsr-lending-')).map((k) => window.caches.delete(k)))
              .catch(() => {})
          }
          const wasControlled = Boolean(navigator.serviceWorker.controller)
          const lastReload = Number(sessionStorage.getItem('sw-cleanup-reload') || 0)
          if (wasControlled && results.some(Boolean) && Date.now() - lastReload > 60000) {
            sessionStorage.setItem('sw-cleanup-reload', String(Date.now()))
            window.location.reload()
          }
        })
      })
      .catch(() => {})
    return
  }

  let hadController = Boolean(navigator.serviceWorker.controller)
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Ignore the very first install, otherwise every new visitor would reload once.
    if (!hadController) {
      hadController = true
      return
    }
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })

  // The browser already checks /sw.js when the page loads. For tabs that stay open,
  // re-check on a timer and whenever the user comes back to the tab, so a deploy lands
  // within minutes instead of waiting for the next visit. This is cheap: sw.js is small
  // and revalidated with a 304, and a reload only ever happens when a *new* build exists.
  const SW_UPDATE_CHECK_INTERVAL = 5 * 60 * 1000
  const checkForUpdate = () => {
    navigator.serviceWorker
      .getRegistration()
      .then((reg) => (reg ? reg.update() : undefined))
      .catch(() => {})
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(checkForUpdate)
      .catch(() => {})
    setInterval(checkForUpdate, SW_UPDATE_CHECK_INTERVAL)
  })

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate()
  })
  window.addEventListener('focus', checkForUpdate)
}

setupServiceWorker()

if (Capacitor.isNativePlatform()) {
  import('@capacitor/app').then(({ App }) => {
    App.addListener('appUrlOpen', async ({ url }) => {
      if (url.startsWith('jsrlending://')) {
        const hash = url.split('#')[1]
        let accessToken, refreshToken
        if (hash) {
          const params = new URLSearchParams(hash)
          accessToken = params.get('access_token')
          refreshToken = params.get('refresh_token')
        }
        if (accessToken && refreshToken) {
          try {
            await supabase.auth.getUser(accessToken)
          } catch {}
          await supabase.auth.signOut().catch(() => {})
          window.location.hash = '#/login'
        }
      }
    })
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
