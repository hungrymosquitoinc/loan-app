import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { obfuscateBundle } from './vite-obfuscator.mjs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

/**
 * Copies public/sw.js to dist/sw.js with a unique build id baked in.
 * The id changes on every build, so browsers always see a byte-different service
 * worker after a deploy, install it, and src/main.jsx reloads open tabs for the user.
 */
function stampServiceWorker() {
  let buildId = ''
  return {
    name: 'stamp-service-worker',
    apply: 'build',
    buildStart() {
      buildId = `${pkg.version}-${Date.now().toString(36)}`
    },
    generateBundle() {
      const source = readFileSync(new URL('./public/sw.js', import.meta.url), 'utf8')
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: source.replace('__BUILD_ID__', buildId),
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), obfuscateBundle(), stampServiceWorker()],
  base: '/',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build: { outDir: 'dist' }
})
