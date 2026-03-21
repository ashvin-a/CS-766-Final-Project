import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [react()],
  root: '.',
  build: {
    outDir: 'dist',
  },
  server: {
    host: 'localhost',
    port: 5173,
    open: true,
  },
})
