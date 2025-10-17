import react from '@vitejs/plugin-react'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const projectRootDir = dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(projectRootDir, 'src'),
      '@app': resolve(projectRootDir, 'src/app'),
      '@features': resolve(projectRootDir, 'src/features'),
      '@shared': resolve(projectRootDir, 'src/shared'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: resolve(projectRootDir, 'src/test/setup.ts'),
    css: true,
  },
})
