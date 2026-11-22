import { useState, useEffect } from 'react'
import { native } from '../lib/native'
import { apiGet } from '../lib/api'

// Compares '1.0.5' > '1.0.4' numerically, ignoring any leading 'v'.
export function isNewerVersion(latest, current) {
  const a = String(latest || '').replace(/^v/i, '').split('.')
  const b = String(current || '').replace(/^v/i, '').split('.')
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = parseInt(a[i], 10) || 0
    const y = parseInt(b[i], 10) || 0
    if (x !== y) return x > y
  }
  return false
}

/**
 * The installed APK cannot swap itself out silently, so the native build gets a
 * dismissible banner instead: tap Update to open the download, then install.
 *
 * Returns nothing on the web, where the service worker (see src/main.jsx) already
 * applies new builds automatically. All platform calls go through ../lib/native so
 * this component can be exercised without a device.
 */
export default function AppUpdateBanner() {
  const [update, setUpdate] = useState(null)

  useEffect(() => {
    if (!native.isNativePlatform()) return
    let alive = true

    // Checks on open and again every time the app returns to the foreground.
    async function check() {
      try {
        const [installedVersion, latestInfo] = await Promise.all([
          native.getInstalledVersion(),
          apiGet('/version'),
        ])
        // No APK hosted yet (e.g. before the file is committed) -> nothing to offer.
        if (!alive || !latestInfo?.apk_url) return
        if (isNewerVersion(latestInfo.latest, installedVersion)) {
          setUpdate({ version: latestInfo.latest, apk_url: latestInfo.apk_url })
        } else {
          setUpdate(null)
        }
      } catch {
        // Update checks are best effort - never block the app on them.
      }
    }

    check()

    let unsubscribe = null
    let tornDown = false
    native
      .onForeground(check)
      .then((off) => {
        unsubscribe = off
        if (tornDown) off()
      })
      .catch(() => {})

    return () => {
      alive = false
      tornDown = true
      if (unsubscribe) unsubscribe()
    }
  }, [])

  if (!update) return null

  async function handleUpdate() {
    try {
      await native.openUrl(update.apk_url)
    } catch {}
  }

  return (
    <div
      role="status"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
        color: '#fff',
        padding: '10px 14px',
        fontSize: '0.85rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}
    >
      <span style={{ flex: 1 }}>
        <strong>Update available</strong> — v{update.version}
      </span>
      <button
        onClick={handleUpdate}
        style={{ background: '#fff', color: '#0d47a1', border: 'none', borderRadius: 6, padding: '7px 14px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
      >
        Update
      </button>
      <button
        onClick={() => setUpdate(null)}
        aria-label="Dismiss update notice"
        style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', lineHeight: 1, cursor: 'pointer', padding: '0 2px' }}
      >
        ×
      </button>
    </div>
  )
}
