import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase')) {
              return 'firebase'
            }
            if (id.includes('jspdf')) {
              return 'jspdf'
            }
            if (id.includes('framer-motion')) {
              return 'framer-motion'
            }
            return 'vendor'
          }
        },
      },
    },
  },
})