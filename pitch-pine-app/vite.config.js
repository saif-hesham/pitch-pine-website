import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.REACT_APP_VERCEL_OBSERVABILITY_CLIENT_CONFIG': JSON.stringify(process.env.REACT_APP_VERCEL_OBSERVABILITY_CLIENT_CONFIG),
    'process.env.REACT_APP_VERCEL_OBSERVABILITY_BASEPATH': JSON.stringify(process.env.REACT_APP_VERCEL_OBSERVABILITY_BASEPATH),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('gsap')) return 'gsap'
          if (id.includes('react-dom') || id.includes('react')) return 'vendor'
        },
      },
    },
  },
})
