import { Capacitor } from '@capacitor/core'

/**
 * The single boundary between app code and the native shell.
 *
 * Every Capacitor call lives here instead of inside components, so a component can
 * be rendered and tested without an Android device: tests replace these methods on
 * the exported object (plain properties, so assignment just works) and the component
 * under test behaves exactly as it would on a phone.
 *
 * In production nothing is stubbed — these delegate straight to @capacitor/app.
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
   * Calls `handler` whenever the app returns to the foreground.
   * Resolves to an unsubscribe function.
   */
  async onForeground(handler) {
    const { App } = await import('@capacitor/app')
    const handle = await App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) handler()
    })
    return () => handle.remove()
  },
}
