<script setup>
import { supabase } from '@/lib/supabase'
import { useUserStore } from '@/stores/user'
import { FileQuestion, Home } from 'lucide-vue-next'

const userStore = useUserStore()

// ฟังก์ชัน "ล้างไพ่" (Reset ทุกอย่างแล้วกลับ Login)
const handleBackToLogin = async () => {
  // 1. เคลียร์ Session ของ Supabase
  await supabase.auth.signOut()

  // 2. เคลียร์ Store ของเรา
  userStore.clearSession()

  // 3. ใช้ window.location.replace (แทน router.push)
  // เพื่อบังคับโหลดหน้าใหม่ 100% แก้จอขาวค้างได้ชะงัดนัก!
  window.location.replace('/login')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
    <div class="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center max-w-md w-full">

      <div class="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
        <FileQuestion class="w-10 h-10 text-indigo-600" />
      </div>

      <h1 class="text-4xl font-bold text-gray-800 mb-2">404</h1>
      <h2 class="text-xl font-semibold text-gray-700 mb-4">ไม่พบหน้าที่คุณต้องการ</h2>

      <p class="text-gray-500 mb-8 text-sm leading-relaxed">
        หน้านี้อาจถูกลบไปแล้ว หรือ URL ไม่ถูกต้อง <br>
        กรุณากลับไปเข้าสู่ระบบใหม่อีกครั้ง
      </p>

      <button
        @click="handleBackToLogin"
        class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-200"
      >
        <Home class="w-5 h-5" />
        กลับไปหน้าเข้าสู่ระบบ
      </button>

    </div>
  </div>
</template>
