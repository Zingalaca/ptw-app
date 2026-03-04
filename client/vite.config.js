import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
//
// API routing strategy:
//   Development  — Vite dev server proxies /api/* → http://localhost:3001
//                  (VITE_API_URL is unset; src/lib/api.js returns '' so URLs stay relative)
//   Production   — Set VITE_API_URL=https://your-backend.example.com in Vercel env vars.
//                  Vite embeds it at build time via import.meta.env.VITE_API_URL.
//                  src/lib/api.js returns that base URL and all fetch calls become absolute.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
