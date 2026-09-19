import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  build: {
    // The exercise library is a deliberately separate, lazily-loaded chunk
    // (~1.4MB raw / ~185KB gzip); the default 500kB warning is noise here.
    chunkSizeWarningLimit: 1600,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
