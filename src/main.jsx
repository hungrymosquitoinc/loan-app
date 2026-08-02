import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { supabase } from './lib/supabase'
import { Capacitor } from '@capacitor/core'

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
        if (!accessToken) {
          const stored = localStorage.getItem('pending_auth_tokens')
          if (stored) {
            const tokens = JSON.parse(stored)
            accessToken = tokens.access_token
            refreshToken = tokens.refresh_token
            localStorage.removeItem('pending_auth_tokens')
          }
        }
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          window.location.hash = ''
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
