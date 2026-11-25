import { defineConfig, loadEnv } from '@rsbuild/core'
import { pluginReact } from '@rsbuild/plugin-react'

const { publicVars } = loadEnv({ prefixes: ['PUBLIC_', 'VITE_'] })

export default defineConfig({
  plugins: [pluginReact()],
  html: {
    template: './index.html',
  },
  source: {
    entry: {
      index: './src/main.jsx',
    },
    define: publicVars,
  },
  resolve: {
    alias: {
      '@': './src',
    },
  },
  server: {
    host: 'localhost',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  output: {
    distPath: {
      root: 'dist',
    },
  },
  performance: {
    chunkSplit: {
      strategy: 'split-by-experience',
    },
  },
})
