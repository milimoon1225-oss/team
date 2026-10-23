import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { pwaShell } from './build-pwa.mjs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), pwaShell()],
})
