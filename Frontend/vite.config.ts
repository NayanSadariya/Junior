import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),

    VitePWA({
      registerType: 'autoUpdate',

      manifest: {
        name: 'JUNIOR',
        short_name: 'JUNIOR',
        description: 'Your personal AI companion',
        theme_color: '#f5f5f5',
        background_color: '#f5f5f5',
        display: 'standalone',
        start_url: '/',
        icons: [],
      },
    }),
  ],
})