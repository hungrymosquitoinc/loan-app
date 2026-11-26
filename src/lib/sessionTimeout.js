import { supabase } from './supabase'
import { native } from './native'

/**
 * Signs the user out when the Android app has been away from the foreground for
 * longer than CLOSED_LOGOUT_MS.
 *
 * How the gap is measured: a "last active" timestamp is stamped whenever the app
 * leaves the foreground (and refreshed by a heartbeat while it is open, so a
 * process that dies without getting a chance to report still leaves a usable
 * stamp). On the next open the difference between now and that stamp is the time
 * the user spent *away* — if it is over the limit, the session is dropped and the
 * login screen is shown.
 *
 * Native only: the web app keeps its normal browser session behaviour.
 */

// Two hours away from the app ends the session.
export const CLOSED_LOGOUT_MS = 2 * 60 * 60 * 1000
export const LAST_ACTIVE_KEY = 'jsr-last-active-at'
const HEARTBEAT_MS = 60 * 1000
const SIGN_OUT_TIMEOUT_MS = 1500

export function touchLastActive(ts = Date.now()) {
  try {
    window.localStorage.setItem(LAST_ACTIVE_KEY, String(ts))
  } catch {}
}

export function readLastActive() {
  try {
    const ts = Number(window.localStorage.getItem(LAST_ACTIVE_KEY))
    return Number.isFinite(ts) && ts > 0 ? ts : null
  } catch {
    return null
  }
}

export function clearLastActive() {
  try {
    window.localStorage.removeItem(LAST_ACTIVE_KEY)
  } catch {}
}

/** Milliseconds the app spent away from the foreground, or null if never stamped. */
export function msClosed(now = Date.now()) {
  const stamped = readLastActive()
  return stamped === null ? null : Math.max(0, now - stamped)
}

export function wasClosedTooLong(now = Date.now(), limit = CLOSED_LOGOUT_MS) {
  const gap = msClosed(now)
  return gap !== null && gap >= limit
}

/**
 * Drops the session. Tries the server-side revocation first so a stolen refresh
 * token dies too, but never lets an unreachable server keep the device signed in:
 * after SIGN_OUT_TIMEOUT_MS (or on any error) the local session is cleared anyway.
 */
export async function expireSession() {
  try {
    await Promise.race([
      supabase.auth.signOut(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('sign-out timed out')), SIGN_OUT_TIMEOUT_MS)
      ),
    ])
    return
  } catch {}
  try {
    await supabase.auth.signOut({ scope: 'local' })
  } catch {}
}

/**
 * Starts the closed-too-long check. Resolves once the reopen decision has been
 * made (so callers can render afterwards and never flash protected data), then
 * keeps watching foreground/background transitions.
 *
 * Returns a teardown function; on the web it resolves immediately to a no-op.
 */
export async function setupSessionTimeout({ onExpired = expireSession, limit = CLOSED_LOGOUT_MS } = {}) {
  if (!native.isNativePlatform()) return () => {}

  // App came back: expire if it was away too long, otherwise stamp this session.
  const onReopen = async () => {
    if (!wasClosedTooLong(Date.now(), limit)) {
      touchLastActive()
      return false
    }
    clearLastActive()
    try {
      await onExpired()
    } catch {}
    return true
  }

  // App went away: stamp the moment so the next open can measure the gap.
  const onLeave = () => touchLastActive()

  await onReopen()

  const onAppState = (isActive) => {
    if (isActive) onReopen().catch(() => {})
    else onLeave()
  }
  const onVisibility = () => {
    if (document.visibilityState === 'visible') onReopen().catch(() => {})
    else onLeave()
  }

  let unsubscribe = null
  let tornDown = false
  native
    .onAppState(onAppState)
    .then((off) => {
      unsubscribe = off
      if (tornDown) off()
    })
    .catch(() => {})

  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', onLeave)

  // Covers a process that is killed without ever reporting that it went away.
  const heartbeat = setInterval(() => {
    if (document.visibilityState === 'visible') touchLastActive()
  }, HEARTBEAT_MS)

  return () => {
    tornDown = true
    if (unsubscribe) unsubscribe()
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('pagehide', onLeave)
    clearInterval(heartbeat)
  }
}
