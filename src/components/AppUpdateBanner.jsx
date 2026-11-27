import { useState, useEffect, useRef } from 'react'
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
 * dismissible banner that downloads the update *inside* the app: tapping Update
 * streams the APK with a live progress bar, then Android's install prompt takes
 * over (asking once for "install unknown apps" if needed).
 *
 * Returns nothing on the web, where the service worker (see src/main.jsx) already
 * applies new builds automatically. All platform calls go through ../lib/native so
 * this component can be exercised without a device.
 */
export default function AppUpdateBanner() {
  const [update, setUpdate] = useState(null)
  // idle -> downloading -> ready | needsPermission | error (error retries the download)
  const [phase, setPhase] = useState('idle')
  const [pct, setPct] = useState(null) // null = server sent no Content-Length
  const [apkPath, setApkPath] = useState(null)
  const [errorText, setErrorText] = useState('')

  const dismissedRef = useRef(false)
  const busyRef = useRef(false)
  // Live mirror so the foreground handler (captured once by the effect below)
  // can see the current phase without resubscribing on every progress tick.
  const liveRef = useRef({ phase: 'idle', apkPath: null })
  liveRef.current = { phase, apkPath }

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
      .onAppState((isActive) => {
        if (!isActive || !alive) return
        check()
        // Returning from the "install unknown apps" Settings screen: the grant is
        // in place now, so fire the install prompt without making the user tap again.
        const { phase: currentPhase, apkPath: path } = liveRef.current
        if (currentPhase === 'needsPermission' && path && !dismissedRef.current) {
          runInstall(path)
        }
      })
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

  /** Calls the installer. Landed-on states: ready (retry) / needsPermission. */
  async function doInstall(path) {
    try {
      const result = await native.installApk(path)
      if (dismissedRef.current) return
      setPhase(result && result.granted === false ? 'needsPermission' : 'ready')
    } catch {
      if (dismissedRef.current) return
      // Keep the downloaded file: the Install button retries without re-downloading.
      setPhase('ready')
    }
  }

  /** Guarded install entry point (button + foreground retry). */
  async function runInstall(path) {
    if (busyRef.current || !path || dismissedRef.current) return
    busyRef.current = true
    try {
      await doInstall(path)
    } finally {
      busyRef.current = false
    }
  }

  /** Download, then immediately hand the file to the installer. */
  async function handleUpdate() {
    if (busyRef.current) return
    busyRef.current = true
    try {
      setPhase('downloading')
      setPct(null)
      setErrorText('')

      let path
      try {
        const result = await native.downloadApk(update.apk_url, (received, total) => {
          setPct(total > 0 ? Math.min(100, Math.round((received / total) * 100)) : null)
        })
        path = result && result.path
      } catch {
        if (dismissedRef.current) return
        setPhase('error')
        setErrorText('Download failed. Check your connection and try again.')
        return
      }

      // Dismissed mid-download: abandon quietly, never pop the installer later.
      if (!path || dismissedRef.current) return
      setApkPath(path)
      await doInstall(path)
    } finally {
      busyRef.current = false
    }
  }

  function handlePrimary() {
    if (phase === 'idle' || phase === 'error') handleUpdate()
    else runInstall(apkPath)
  }

  function handleDismiss() {
    dismissedRef.current = true
    setUpdate(null)
  }

  const downloading = phase === 'downloading'
  const primaryLabel = phase === 'error' ? 'Retry' : phase === 'idle' ? 'Update' : 'Install'

  let message
  if (phase === 'error') {
    message = (
      <>
        <strong>Update failed</strong> — {errorText}
      </>
    )
  } else if (phase === 'needsPermission') {
    message = (
      <>
        <strong>One-time step</strong> — allow installs from JSR Lending, then tap Install.
      </>
    )
  } else if (phase === 'ready') {
    message = (
      <>
        <strong>Update downloaded</strong> — v{update.version}
      </>
    )
  } else {
    message = (
      <>
        <strong>Update available</strong> — v{update.version}
      </>
    )
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
      {downloading ? (
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span>
            Downloading update…{pct !== null ? ` ${pct}%` : ''}
          </span>
          <div
            style={{ height: 6, background: 'rgba(255,255,255,0.3)', borderRadius: 3, overflow: 'hidden' }}
          >
            <div
              style={{
                height: '100%',
                width: pct !== null ? `${pct}%` : '100%',
                background: '#fff',
                borderRadius: 3,
                opacity: pct !== null ? 1 : 0.45,
                transition: 'width 0.25s ease',
              }}
            />
          </div>
        </div>
      ) : (
        <>
          <span style={{ flex: 1, minWidth: 0 }}>{message}</span>
          <button
            onClick={handlePrimary}
            style={{
              background: '#fff',
              color: '#0d47a1',
              border: 'none',
              borderRadius: 6,
              padding: '7px 14px',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {primaryLabel}
          </button>
        </>
      )}
      <button
        onClick={handleDismiss}
        aria-label={downloading ? 'Cancel update download' : 'Dismiss update notice'}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#fff',
          fontSize: '1.2rem',
          lineHeight: 1,
          cursor: 'pointer',
          padding: '0 2px',
        }}
      >
        ×
      </button>
    </div>
  )
}
