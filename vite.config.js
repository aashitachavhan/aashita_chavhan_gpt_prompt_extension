import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import copy from 'rollup-plugin-copy'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    copy({
      targets: [
        { src: 'src/content/contentScript.js', dest: 'dist' },
        { src: 'src/background/background.js', dest: 'dist' }, // <--- Copy content script
      ],
      hook: 'writeBundle'
    })
  ],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html'
      }
    }
  }
})
