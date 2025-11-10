import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      }
    }
  },
  // No base path - Nginx will handle routing
  // Assets will be at /assets/ and Nginx will proxy /journey/ -> container:80/
  base: '/',
})
