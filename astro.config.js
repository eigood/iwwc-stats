import { defineConfig } from 'astro/config'
import react from '@astrojs/react'

export default defineConfig({
  outDir: 'deploy/pregen',
  base: '/iwwc-stats/pregen',
  integrations: [
    react(),
  ],
})

