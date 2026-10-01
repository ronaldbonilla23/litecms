import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// El admin se publica dentro de core en /admin (ver core/src/index.ts)
const CORE_URL = 'http://localhost:3000'

// https://vite.dev/config/
export default defineConfig({
  base: '/admin/',
  plugins: [react()],
  resolve: {
    // shared/ no tiene node_modules propio: sus dependencias se resuelven desde el admin
    dedupe: ['zod', 'react', 'react-dom'],
  },
  server: {
    // En desarrollo, Vite reenvía al servidor core todo lo que no es el admin
    proxy: {
      '/api': { target: CORE_URL, changeOrigin: true },
      '/uploads': { target: CORE_URL, changeOrigin: true },
      '/css': { target: CORE_URL, changeOrigin: true },
    },
  },
})
