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
  build: {
    // 每次构建生成唯一的文件名，避免浏览器缓存问题
    rollupOptions: {
      output: {
        // 添加时间戳到文件名，确保每次构建文件名都不同
        entryFileNames: 'assets/[name]-[hash]-' + Date.now() + '.js',
        chunkFileNames: 'assets/[name]-[hash]-' + Date.now() + '.js',
        assetFileNames: 'assets/[name]-[hash]-' + Date.now() + '.[ext]'
      }
    }
  },
  server: {
    port: 3001,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
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





