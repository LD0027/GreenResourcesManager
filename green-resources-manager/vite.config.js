import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        pet: resolve(__dirname, 'public/html/pet.html'),
        'video-player': resolve(__dirname, 'public/html/video-player.html')
      }
    }
  },
  publicDir: 'public',
  server: {
    port: 5173,
    host: 'localhost'
  }
})
