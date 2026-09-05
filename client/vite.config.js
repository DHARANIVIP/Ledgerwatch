import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',        // outputs to client/dist (served by app.py)
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      // During dev, forward all /api calls to the FastAPI backend
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
