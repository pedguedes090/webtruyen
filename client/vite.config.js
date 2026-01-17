import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true
            }
        }
    },
    build: {
        // Code splitting optimization
        rollupOptions: {
            output: {
                manualChunks: {
                    // Separate React core into its own chunk (rarely changes)
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                    // Separate Framer Motion (large library)
                    'framer': ['framer-motion'],
                    // Separate axios
                    'axios': ['axios']
                }
            }
        },
        // Increase chunk size warning limit
        chunkSizeWarningLimit: 500,
        // Enable minification
        minify: 'esbuild',
        // Enable source maps for production debugging
        sourcemap: false
    }
})

