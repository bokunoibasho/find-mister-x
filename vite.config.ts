/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages project site is served from /find-mister-x/
export default defineConfig({
  base: '/find-mister-x/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'MISTER X を探せ',
        short_name: 'MISTER X',
        description: 'スコットランドヤード風の鬼ごっこ型ボードゲーム。iPhone対応のオフラインPWA。',
        lang: 'ja',
        start_url: '.',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0f1226',
        theme_color: '#0f1226',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json,webmanifest}']
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}']
  }
})
