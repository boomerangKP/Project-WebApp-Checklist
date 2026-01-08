import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
// 👇 1. นำเข้า Plugin PWA
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    // 👇 2. ตั้งค่า PWA ตรงนี้
    VitePWA({
      registerType: 'autoUpdate', // อัปเดตแอปอัตโนมัติเมื่อมีเวอร์ชันใหม่
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],

      // ข้อมูลที่จะแสดงตอนติดตั้งแอป
      manifest: {
        name: 'Princ Hospital Service', // ชื่อเต็ม
        short_name: 'PrincService',     // ชื่อย่อ (ใต้ไอคอน)
        description: 'ระบบบันทึกงานแม่บ้านและประเมินความพึงพอใจ โรงพยาบาลพริ้นซ์ อุบลราชธานี',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone', // เปิดแบบเต็มจอเหมือนแอป (ไม่มีช่อง URL)
        orientation: 'portrait', // ล็อกแนวตั้ง
        start_url: '/',

        // ⚠️ สำคัญ: คุณต้องเอารูปไอคอนไปวางในโฟลเดอร์ public ให้ชื่อตรงกันนะ
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },

      // เปิดให้ทดสอบ PWA ในเครื่องตัวเองได้ (localhost)
      devOptions: {
        enabled: true
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
