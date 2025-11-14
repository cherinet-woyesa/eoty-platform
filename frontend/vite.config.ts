import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/context': path.resolve(__dirname, './src/context'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/config': path.resolve(__dirname, './src/config'),
      '@/styles': path.resolve(__dirname, './src/styles'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/i18n': path.resolve(__dirname, './src/i18n'),
    },
  },
  build: {
    // Optimize build output
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'], // Remove specific console methods
      },
    },
    // Code splitting - Simplified to prevent React loading issues
    rollupOptions: {
      output: {
        // Ensure proper chunk loading order
        chunkFileNames: (chunkInfo) => {
          // React core should be in main bundle (no special naming)
          if (chunkInfo.name === 'react-vendor') {
            return 'assets/react-vendor-[hash].js';
          }
          return 'assets/[name]-[hash].js';
        },
        manualChunks: (id) => {
          // CRITICAL: Keep React in main bundle to ensure it loads first
          // This prevents "Cannot read properties of undefined (reading 'useState')" errors
          if (id.includes('node_modules/react') || 
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react-router') ||
              id.includes('node_modules/react-router-dom') ||
              id.includes('node_modules/scheduler')) {
            // Keep React core in main bundle - return undefined
            return undefined;
          }
          
          // CRITICAL: All React-dependent packages must be in react-vendor chunk
          // This ensures they load after React is available
          if (id.includes('node_modules/@tanstack/react-query') ||
              id.includes('node_modules/react-i18next') ||
              id.includes('node_modules/@headlessui/react') ||
              id.includes('node_modules/@mux/mux-player-react') ||
              id.includes('node_modules/@mux/mux-uploader-react') ||
              id.includes('node_modules/recharts') ||
              id.includes('node_modules/framer-motion') ||
              id.includes('node_modules/@dnd-kit') ||
              id.includes('node_modules/lucide-react') ||
              id.includes('node_modules/rc-slider')) {
            // Group all React-dependent packages together
            return 'react-vendor';
          }
          
          // Split node_modules into vendor chunks
          if (id.includes('node_modules')) {
            // Non-React libraries get their own chunks
            if (id.includes('socket.io')) {
              return 'socket-vendor';
            }
            if (id.includes('i18next') && !id.includes('react-i18next')) {
              return 'i18n-vendor';
            }
            // Split other large dependencies
            if (id.includes('axios')) {
              return 'axios-vendor';
            }
            if (id.includes('date-fns')) {
              return 'date-vendor';
            }
            // Group remaining node_modules into a single vendor chunk
            return 'vendor';
          }
          
          // Split large page components
          if (id.includes('/pages/teacher/RecordVideo')) {
            return 'record-video';
          }
          if (id.includes('/components/teacher/dashboard/VideoAnalyticsDashboard')) {
            return 'video-analytics';
          }
          if (id.includes('/pages/admin/MuxMigration')) {
            return 'mux-migration';
          }
        },
      },
    },
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Source maps only in development
    sourcemap: false,
    // Optimize assets
    assetsInlineLimit: 4096, // Inline assets smaller than 4kb
  },
  server: {
    host: true,
    port: 3000,
  },
  preview: {
    host: true,
    port: 3000,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'lucide-react',
    ],
    exclude: ['@ffmpeg/ffmpeg'], // Exclude large dependencies from pre-bundling
  },
})