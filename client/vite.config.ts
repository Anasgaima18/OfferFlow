import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 500,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/react-router-dom/')
            ) {
              return 'react';
            }
            if (id.includes('@monaco-editor/react') || id.includes('/monaco-editor/')) {
              return 'monaco';
            }
            if (
              id.includes('@tanstack/react-query') ||
              id.includes('@supabase/supabase-js') ||
              id.includes('/axios/') ||
              id.includes('/zod/')
            ) {
              return 'data';
            }
            if (id.includes('/lucide-react/') || id.includes('/sonner/')) {
              return 'ui';
            }
          }
          return undefined;
        },
      },
    },
  },
})
