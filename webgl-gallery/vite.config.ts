import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        rectangularGallery: resolve(__dirname, 'rectangular-gallery.html'),
      },
    },
  },
})
