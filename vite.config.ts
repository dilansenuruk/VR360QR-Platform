import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Forwards API/upload requests to the local Express backend so the
    // browser sees everything as same-origin (localhost:5173) -- this keeps
    // the session cookie working without any CORS configuration.
    proxy: {
      '/api': 'http://localhost:3001',
      '/uploads': 'http://localhost:3001',
    },
  },
})
