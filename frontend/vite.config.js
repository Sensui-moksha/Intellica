import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite Configuration — Monorepo Setup
 * ─────────────────────────────────────────────────────────────────────────────
 * This file is the single source of truth for the frontend server port and
 * the backend API URL. The backend reads this file at boot via
 * utils/monorepoConfig.js to auto-configure CORS — no hardcoded origins.
 *
 *   Frontend dev server : http://localhost:5173
 *   Backend API         : http://localhost:5001   (from backend/.env PORT)
 *   Proxy rule          : /api/*  →  backend
 *   Proxy rule          : /uploads/* → backend (served files)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const BACKEND_PORT = 5001; // must match backend/.env PORT

export default defineConfig({
  plugins: [react()],

  server: {
    host: true,          // Expose to local network (0.0.0.0)
    port: 5173,          // ← backend reads this to configure CORS
    strictPort: true,    // fail fast if port is already in use

    proxy: {
      // All /api/* calls are proxied to the backend — no CORS in dev
      '/api': {
        target: `http://localhost:${BACKEND_PORT}`,
        changeOrigin: true,
        secure: false,
      },
      // Serve uploaded files (PDFs, images) from the backend static folder
      '/uploads': {
        target: `http://localhost:${BACKEND_PORT}`,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
