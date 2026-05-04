import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Build-only config — no test settings here.
// Vitest config lives in vitest.config.ts to avoid type conflicts
// between vite's and vitest's bundled vite versions.
export default defineConfig({
  plugins: [react()],
})
