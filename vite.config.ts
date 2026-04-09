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
  // Port 5174 so SvelteKit (svelte-app) can own 5173; run both dev servers in parallel.
  server: {
    port: 5174,
    strictPort: true,
    host: true,
    hmr: {
      overlay: true,
      port: 5174,
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: 'hidden',
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/react-router-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/@fluentui/react-components') || id.includes('node_modules/@fluentui/react-icons')) {
            return 'vendor-fluent';
          }
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-framer';
          }
          if (id.includes('node_modules/zustand') || id.includes('node_modules/immer')) {
            return 'vendor-zustand';
          }
        },
      },
    },
  },
});
