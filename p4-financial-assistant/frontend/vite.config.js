import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { compression } from 'vite-plugin-compression2'

export default defineConfig({
  plugins: [
    react(),
    compression({ algorithm: 'gzip' }),
    compression({ algorithm: 'brotliCompress', exclude: [/\.gz$/] }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('lucide-react')) return 'icons'
            if (id.includes('recharts') || id.includes('d3-')) return 'charts'
            if (id.includes('react-router')) return 'router'
            if (id.includes('react')) return 'vendor'
          }
        },
      },
    },
  },
})
