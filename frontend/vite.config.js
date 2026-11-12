import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProd = mode === 'production'
  
  return {
    plugins: [
      react({
        // Enable Fast Refresh for improved development experience
        fastRefresh: true,
      }),
      tailwindcss(),
    ],
    
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'), // Enable @/components style imports
      },
    },
    
    build: {
      // Reduce chunk size warnings threshold
      chunkSizeWarningLimit: 1000,
      // Generate source maps for production debugging
      sourcemap: isProd ? 'hidden' : true,
      // Use terser for production minification
      minify: isProd ? 'terser' : false,
      terserOptions: {
        compress: {
          drop_console: isProd, // Remove console logs in production
        },
      },
      rollupOptions: {
        output: {
          manualChunks: {
            // Split vendor libraries into separate chunks
            vendor: ['react', 'react-dom', 'react-router-dom'],
            ui: ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          },
        },
      },
    },
    
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.js'],
      // e2e/live guards are plain functions with synthetic-frame unit tests; the live spec itself needs a running instance.
      include: ['src/**/*.test.{js,jsx}', 'e2e/live/**/*.test.js'],
    },

    server: {
      // Optimize HMR for faster updates
      hmr: {
        overlay: true,
      },
    },
  }
})