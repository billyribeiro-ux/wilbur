import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true, // Prevent automatic port switching - fixes WebSocket connection
    host: true,
    hmr: {
      overlay: true,
      port: 5173, // Ensure HMR WebSocket uses same port
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: 'hidden',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-fluent': ['@fluentui/react-components', '@fluentui/react-icons'],
          'vendor-livekit': ['livekit-client'],
          'vendor-framer': ['framer-motion'],
          'vendor-zustand': ['zustand', 'immer'],
        },
      },
    },
  },
});
