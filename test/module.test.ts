import { fileURLToPath } from 'node:url'
import { setup } from '@nuxt/test-utils'
import { describe } from 'vitest'

describe.skip('nuxt-svg-icon-sprite', async () => {
  await setup({
    server: true,
    rootDir: fileURLToPath(new URL('../playground', import.meta.url)),
    nuxtConfig: {},
    build: true,
    runner: 'vitest',
  })
})
