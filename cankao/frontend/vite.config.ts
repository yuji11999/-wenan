import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: Number(process.env.VITE_PORT) || 3001,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => {
          const newPath = path.replace(/^\/api/, '')
          console.log(`[Proxy] ${path} -> ${newPath}`)
          return newPath
        },
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('[Proxy Error]', err)
          })
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('[Proxy Request]', req.method, req.url, '->', proxyReq.path)
          })
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('[Proxy Response]', req.url, proxyRes.statusCode)
          })
        }
      }
    }
  }
})





