import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxy the API in development so the browser treats it as same-origin.
// This lets the httpOnly refresh cookie (SameSite=Lax) flow without CORS
// credential complications. The proxy target can be overridden via env.
const API_TARGET = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:4000';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
      '/health': { target: API_TARGET, changeOrigin: true },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
      '/health': { target: API_TARGET, changeOrigin: true },
    },
  },
});
