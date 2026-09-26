import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  define: {
    // MeshJS 需要 buffer polyfill
    global: 'globalThis',
  },
  optimizeDeps: {
    exclude: ['@meshsdk/core', '@meshsdk/react'],
  },
});
