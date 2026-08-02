import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { obfuscateBundle } from './vite-obfuscator.mjs'

export default defineConfig({
  plugins: [react(), obfuscateBundle()],
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
