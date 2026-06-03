import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true, // bind 0.0.0.0 for reliable access (fixes IPv6-only localhost issues)
    proxy: {
      '/api': (() => {
        // FIXED: Default dev proxy now targets the *local* API server (http://localhost:3001)
        // This ensures when you run `npm run dev` (or dev:ui against running dev:api) you see
        // data from *your own* backend instance. Real-time ingest, /diag, persistence etc all match what
        // the local (or your Railway) server actually holds.
        //
        // To point your local UI at a deployed Railway instance (or the old dashboard.n0m3rci.cc) for testing
        // against "production" bot data, run with an env var:
        //   VITE_API_TARGET=https://your-dashboard.railway.app npm run dev
        // or temporarily hardcode the target below for one-off remote debug.
        //
        // In production (Railway single-service), the UI is served by the Express server itself
        // from /dist so fetches stay same-origin — no proxy involved. Your bot sends to the public
        // Railway URL (/api/events/report). See README "The No Data Received Fix".
        const target = process.env.VITE_API_TARGET || 'http://localhost:3001';
        const isRemote = /^https:\/\//.test(target);
        return {
          target,
          changeOrigin: isRemote,
          secure: isRemote,
          // Important for SSE / long-lived in dev when proxying remote
          ws: false,
        };
      })(),
    },
  },
})
