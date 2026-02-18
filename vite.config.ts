import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  build: {
    // Don't include source maps in production (prevents file path leaks)
    sourcemap: false,
    // Optimize chunk splitting for better caching and performance
    rollupOptions: {
      output: {
        manualChunks: {
          // React core libraries
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Chart.js and heavy visualization libraries
          'charts': ['chart.js', 'react-chartjs-2'],
        },
      },
    },
    // Increase chunk size warning limit (we have code splitting now)
    chunkSizeWarningLimit: 1000,
  },
  server: {
    host: '0.0.0.0',
    strictPort: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      clientPort: 5173,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5002',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
})
