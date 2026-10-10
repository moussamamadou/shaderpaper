import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Unit tests for pure utilities (app/**/__tests__) and the copy-engine script;
// they don't need the Nuxt runtime, so plain Vitest with the `~` and `#shared`
// aliases is enough.
export default defineConfig({
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./app', import.meta.url)),
      '#shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['app/**/__tests__/*.test.ts', 'shared/**/__tests__/*.test.ts', 'server/**/__tests__/*.test.ts', 'scripts/__tests__/*.test.ts'],
  },
})
