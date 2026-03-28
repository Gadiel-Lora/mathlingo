import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return
          }

          if (id.includes('react-force-graph') || id.includes('three')) {
            return 'graph-3d'
          }

          if (id.includes('recharts') || id.includes('victory-vendor')) {
            return 'charts'
          }

          if (id.includes('framer-motion')) {
            return 'motion'
          }

          if (id.includes('react-katex') || id.includes('katex')) {
            return 'katex'
          }

          if (id.includes('html2pdf.js') || id.includes('jspdf') || id.includes('html2canvas')) {
            return 'export-pdf'
          }

          if (
            id.includes('react') ||
            id.includes('react-dom') ||
            id.includes('react-router-dom') ||
            id.includes('scheduler')
          ) {
            return 'react-vendor'
          }
        },
      },
    },
  },
})
