import { Capacitor, registerPlugin } from '@capacitor/core'

// Local plugin registered by MainActivity (android/.../ApkUpdaterPlugin.java).
// registerPlugin() builds a lazy proxy: nothing touches the native side until a
// method is called, so importing this module on the web is harmless.
const ApkUpdater = registerPlugin('ApkUpdater')

/**
 * The single boundary between app code and the native shell.
 *
 * Every Capacitor call lives here instead of inside components, so a component can
 * be rendered and tested without an Android device: tests replace these methods on
 * the exported object (plain properties, so assignment just works) and the component
 * under test behaves exactly as it would on a phone.
 *
 * In production nothing is stubbed — these delegate straight to @capacitor/app
 * (and the local ApkUpdater plugin for in-app APK updates).
 */
export const native = {
  isNativePlatform: () => Capacitor.isNativePlatform(),

  /** Version reported by the installed package, e.g. '1.0.5'. */
  async getInstalledVersion() {
    const { App } = await import('@capacitor/app')
    const info = await App.getInfo()
    return info.version
  },

  /** Hands a URL to the OS (opens the browser / download manager). */
  async openUrl(url) {
    const { App } = await import('@capacitor/app')
    await App.openUrl({ url })
  },

  /**
   * Reports foreground/background transitions: `handler(true)` when the app comes
   * back, `handler(false)` when it leaves the foreground. Resolves to an
   * unsubscribe function.
   */
  async onAppState(handler) {
    const { App } = await import('@capacitor/app')
    const handle = await App.addListener('appStateChange', ({ isActive }) => {
      handler(Boolean(isActive))
    })
    return () => handle.remove()
  },

  /**
   * Streams the update APK into the app's cache without leaving the app.
   *
   * `onProgress(received, total)` fires as bytes arrive; total is -1 when the
   * server sends no Content-Length. Resolves { path, size } on success.
   */
  async downloadApk(url, onProgress) {
    if (!Capacitor.isNativePlatform()) throw new Error('downloadApk() only runs on a device')

    let handle = null
    if (onProgress) {
      handle = await ApkUpdater.addListener('downloadProgress', ({ received, total }) => {
        onProgress(received, total)
      })
    }
    try {
      return await ApkUpdater.download({ url })
    } finally {
      if (handle) {
        try {
          await handle.remove()
        } catch {}
      }
    }
  },

  /**
   * Hands a downloaded APK to Android's installer.
   *
   * Resolves { granted: false } when the user still has to allow installs from
   * this app — the correct Settings screen has been opened, and the caller should
   * retry on the next foreground. Resolves { granted: true } once the system
   * install dialog has been launched.
   */
  async installApk(path) {
    if (!Capacitor.isNativePlatform()) throw new Error('installApk() only runs on a device')
    return await ApkUpdater.install({ path })
  },
}
