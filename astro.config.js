import { defineConfig } from 'astro/config'
import react from '@astrojs/react'

export default defineConfig({
  outDir: 'deploy/dist',
  integrations: [
    react(),
  ],
})

