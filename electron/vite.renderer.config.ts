import { mergeConfig, defineConfig } from 'vite'
import baseConfig from '../vite.config'

export default defineConfig(async (env) => {
  const resolvedBase =
    typeof baseConfig === 'function'
      ? await baseConfig(env)
      : baseConfig

  return mergeConfig(resolvedBase, {
    base: './',
  })
})

