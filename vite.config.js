import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/MercadoPublico-AG/',
  server: {
    proxy: {
      '/api-mp': {
        target: 'https://api.mercadopublico.cl',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-mp/, ''),
        secure: false,
      },
      '/api-ca': {
        target: 'https://api2.mercadopublico.cl',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-ca/, ''),
        secure: false,
      },
      '/api-oportunidades': {
        target: 'https://mp-oportunidades-proxy.bfrancosentis.workers.dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-oportunidades/, ''),
        secure: true,
      },
      '/api-adjunto': {
        target: 'https://mp-adjunto-proxy.bfrancosentis.workers.dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-adjunto/, ''),
        secure: true,
      },
    },
  },
})
