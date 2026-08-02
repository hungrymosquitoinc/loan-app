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
