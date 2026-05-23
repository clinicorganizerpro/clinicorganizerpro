import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// https://vitejs.dev/config/
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    strictPort: true,
  },
  preview: {
    host: true,
    strictPort: true,
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js', '@supabase/ssr'],
          stripe: ['@stripe/react-stripe-js', '@stripe/stripe-js'],
          lucide: ['lucide-react'],
          db: ['@libsql/client'],
        },
      },
    },
  },
});
