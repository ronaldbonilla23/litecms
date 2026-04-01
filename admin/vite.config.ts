import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Esto le dice a Vite: "Si ves algo que empiece por /api, mándalo al puerto 3000"
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: [
      '@tiptap/react',
      '@tiptap/starter-kit',
      '@tiptap/extension-underline',
      '@tiptap/extension-text-align',
      '@tiptap/extension-link',
      '@tiptap/extension-image',
      '@tiptap/extension-color',
      '@tiptap/extension-text-style'
    ]
  }
})
