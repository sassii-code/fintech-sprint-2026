import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { compression } from 'vite-plugin-compression2'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Emit pre-compressed .gz and .br variants of build output so static
    // hosts that serve them directly (Netlify, Cloudflare, most CDNs) skip
    // compressing on the fly.
    compression({ algorithm: 'gzip' }),
    compression({ algorithm: 'brotliCompress', exclude: [/\.gz$/] }),
  ],
  build: {
    // Split heavy/rarely-changed vendor code into its own chunk so app code
    // changes don't invalidate the (larger, more cacheable) vendor bundle.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('lucide-react')) return 'icons'
            if (id.includes('react')) return 'vendor'
          }
        },
      },
    },
  },
})
