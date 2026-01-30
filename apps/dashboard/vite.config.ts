import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Increase body limit for video generation (250MB)
    hmr: {
      timeout: 120000,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        // Disable buffer to stream large payloads directly to backend
        // This prevents 413 errors for video generation with base64 audio
        ws: true,
        configure: (proxy, _options) => {
          // Log proxy errors for debugging
          proxy.on('error', (err, _req, _res) => {
            console.error('[vite-proxy] Error:', err.message);
          });
        },
      },
    },
  },
});

