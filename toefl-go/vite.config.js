import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'TOEFL Go — 托福學習助手',
        short_name: 'TOEFL Go',
        description: '托福四大科練習、單字 SRS、每日任務與測驗進度',
        theme_color: '#1F4E5F',
        background_color: '#F3F6F4',
        display: 'standalone',
        orientation: 'portrait-primary',
        lang: 'zh-Hant',
        start_url: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
      },
    }),
  ],
  server: { host: true, port: 5174 },
  preview: { host: true, port: 4174, allowedHosts: true },
})
