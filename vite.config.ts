import { defineConfig } from 'vite'

// Set base path for GitHub Pages if BASE_PATH is provided (e.g. /repo-name/)
const base = process.env.BASE_PATH && process.env.BASE_PATH !== '/' ? process.env.BASE_PATH : '/'

export default defineConfig({
  base,
  build: {
    outDir: 'dist',
    sourcemap: false,
    assetsDir: 'assets',
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
  },
})