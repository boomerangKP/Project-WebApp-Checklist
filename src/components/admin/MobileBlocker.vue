<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { Monitor, LogOut, XCircle } from 'lucide-vue-next'
import Swal from 'sweetalert2'

const router = useRouter()
const isMobile = ref(false)

// กำหนดจุดตัด (Breakpoint) เช่น น้อยกว่า 1024px ถือว่าเป็น Tablet/Mobile
const CHECK_WIDTH = 1024 

const checkScreenSize = () => {
  isMobile.value = window.innerWidth < CHECK_WIDTH
}

const handleLogout = async () => {
  const { error } = await supabase.auth.signOut()
  if (!error) {
    router.replace('/login')
  }
}

onMounted(() => {
  checkScreenSize()
  window.addEventListener('resize', checkScreenSize)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize)
})
</script>

<template>
  <div v-if="isMobile" class="fixed inset-0 z-[9999] bg-gray-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
    
    <div class="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full flex flex-col items-center">
      <div class="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-6">
        <Monitor class="w-10 h-10 text-indigo-600" />
      </div>

      <h2 class="text-xl font-bold text-gray-800 mb-2">แสดงผลบน Desktop เท่านั้น</h2>
      <p class="text-gray-500 mb-8 leading-relaxed">
        ระบบจัดการหลังบ้าน (Admin) ถูกออกแบบมาเพื่อการใช้งานบนคอมพิวเตอร์ <br>
        <span class="text-xs text-red-400 mt-2 block">(หน้าจอของคุณเล็กเกินไป)</span>
      </p>

      <button 
        @click="handleLogout"
        class="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors border border-red-100"
      >
        <LogOut class="w-5 h-5" />
        ออกจากระบบ
      </button>

      </div>

    <p class="text-white/50 text-xs mt-8">Prince Hospital Ubon Ratchathani</p>
  </div>
</template>