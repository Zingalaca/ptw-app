// In development, Vite's dev server proxies /api/* → localhost:3001 (vite.config.js).
// API_BASE is therefore '' and relative fetch('/api/...') calls work as-is.
//
// In production (Vercel), set VITE_API_URL to your Express server's base URL:
//   VITE_API_URL=https://your-backend.example.com
// Then every fetch call becomes fetch('https://your-backend.example.com/api/...')
// Make sure the server has CLIENT_URL set to your Vercel domain so CORS allows it.

export const API_BASE = import.meta.env.VITE_API_URL ?? ''
