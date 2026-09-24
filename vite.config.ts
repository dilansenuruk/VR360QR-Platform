import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Forwards API requests (including thumbnail images, served from
    // /api/thumbnails/:id) to the local Express backend so the browser sees
    // everything as same-origin (localhost:5173) -- this keeps the auth
    // cookie working without any CORS configuration.
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
