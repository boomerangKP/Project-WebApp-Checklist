import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import App from './App.vue'
import router from './router'
import './assets/main.css'

const app = createApp(App)

// 1. สร้าง Pinia instance ขึ้นมาก่อน เก็บใส่ตัวแปร
const pinia = createPinia()

// 2. ยัด Plugin ใส่เข้าไปในตัวแปรนั้น
pinia.use(piniaPluginPersistedstate)

// 3. เอาตัวแปร Pinia (ที่มี Plugin แล้ว) ไปบอกให้ App ใช้
app.use(pinia)
app.use(router)

app.mount('#app')
