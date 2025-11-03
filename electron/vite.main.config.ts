import { defineConfig } from 'vite'

export default defineConfig((env) => ({
  build: {
    target: 'node20',
    sourcemap: true,
    lib: {
      entry: env.forgeConfigSelf.entry,
      formats: ['cjs'],
      fileName: () => 'main.cjs',
    },
  },
}))
