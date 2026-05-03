import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

// GitHub Pages project sites use /<repo>/ ; set VITE_BASE=/your-repo/ when building.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? "./",
  build: {
    // Raise warning threshold to accommodate three.js (~600 KB gzip baseline)
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split heavy deps into separate cache-friendly chunks
          three: ["three"],
          r3f: ["@react-three/fiber"],
        },
      },
    },
  },
})
