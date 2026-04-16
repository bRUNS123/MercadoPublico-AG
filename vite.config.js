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
    },
  },
})
