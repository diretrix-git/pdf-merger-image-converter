import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Test-only config — used by vitest, not by vite build.
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    css: true,
  },
})
