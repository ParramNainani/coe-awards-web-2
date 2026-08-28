import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Target modern browsers for smaller output
    target: 'es2020',
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // Split vendor chunks for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Three.js ecosystem in its own chunk (largest dependency, lazy loaded)
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
          // Firebase in its own chunk (loaded on demand)
          'firebase-vendor': ['firebase/app', 'firebase/firestore'],
          // Framer Motion separate chunk
          'motion-vendor': ['framer-motion'],
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 600,
  },
})
