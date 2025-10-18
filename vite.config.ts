import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin, ViteDevServer } from 'vite'
import { defineConfig } from 'vitest/config'

const projectRootDir = dirname(fileURLToPath(import.meta.url))

const consoleRelayPlugin = (): Plugin => {
  return {
    name: 'console-relay',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      const logPath = resolve(projectRootDir, 'console.log')

      server.middlewares.use('/__console-relay', (req, res, next) => {
        if (req.method !== 'POST') {
          next()
          return
        }

        let buffer = ''
        req.setEncoding('utf8')
        req.on('data', (chunk) => {
          buffer += chunk
        })
        req.on('error', (error) => {
          console.error('[console-relay]', error)
          res.statusCode = 400
          res.end()
        })
        req.on('end', () => {
          const entry = buffer.endsWith('\n') ? buffer : `${buffer}\n`
          fs.appendFile(logPath, entry, (error) => {
            if (error) {
              console.error('[console-relay]', error)
            }
          })
          res.statusCode = 204
          res.end()
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), consoleRelayPlugin()],
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
