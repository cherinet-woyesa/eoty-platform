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
    // Code splitting
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Split node_modules into vendor chunks
          if (id.includes('node_modules')) {
            // Large libraries get their own chunks
            if (id.includes('@mux')) {
              return 'mux-vendor';
            }
            if (id.includes('recharts')) {
              return 'chart-vendor';
            }
            if (id.includes('socket.io')) {
              return 'socket-vendor';
            }
            if (id.includes('i18next') || id.includes('react-i18next')) {
              return 'i18n-vendor';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'query-vendor';
            }
            if (id.includes('lucide-react') || id.includes('@headlessui')) {
              return 'ui-vendor';
            }
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            // Split other large dependencies
            if (id.includes('axios')) {
              return 'axios-vendor';
            }
            if (id.includes('date-fns')) {
              return 'date-vendor';
            }
            if (id.includes('framer-motion')) {
              return 'motion-vendor';
            }
            if (id.includes('@dnd-kit')) {
              return 'dnd-vendor';
            }
            // Other node_modules - split into smaller chunks
            if (id.includes('node_modules')) {
              // Group by package name first letter to create smaller chunks
              const match = id.match(/node_modules\/(@?[^\/]+)/);
              if (match) {
                const packageName = match[1];
                // Group packages starting with same letter
                const firstChar = packageName.charAt(0).toLowerCase();
                if (['a', 'b', 'c', 'd'].includes(firstChar)) {
                  return 'vendor-a-d';
                }
                if (['e', 'f', 'g', 'h'].includes(firstChar)) {
                  return 'vendor-e-h';
                }
                if (['i', 'j', 'k', 'l', 'm'].includes(firstChar)) {
                  return 'vendor-i-m';
                }
                return 'vendor-n-z';
              }
            }
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