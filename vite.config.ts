import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  // `localhost` resolves to ::1 on some machines and 127.0.0.1 on others, and
  // Vite's default binds only to whichever one Node picks. Listening on both
  // stacks means the URL works whatever the browser resolves it to.
  server: { host: true, port: 4321 },
})
