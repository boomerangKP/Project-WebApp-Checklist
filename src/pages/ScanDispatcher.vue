<script setup>
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const locationId = route.params.id // รับ ID จาก URL

onMounted(async () => {
  // 1. เช็คว่ามีคน Login ค้างไว้ไหม
  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    // ✅ กรณี: มีการ Login อยู่ (น่าจะเป็นแม่บ้าน)
    // (Optional: เช็ค Role เพิ่มเติมก็ได้ว่าเป็นแม่บ้านจริงไหม)
    console.log('User is logged in. Redirecting to Maid Job...')
    
    // ดีดไปหน้าส่งงาน
    router.replace(`/maid/job/${locationId}`) 
  } else {
    // ❌ กรณี: ไม่ได้ Login (น่าจะเป็นลูกค้า)
    console.log('Guest user. Redirecting to Feedback...')
    
    // ดีดไปหน้าประเมิน
    router.replace(`/feedback/${locationId}`)
  }
})
</script>

<template>
  <div class="h-screen flex flex-col items-center justify-center bg-gray-50">
    <Loader2 class="w-10 h-10 text-indigo-600 animate-spin mb-4" />
    <p class="text-gray-500 font-medium">กำลังตรวจสอบข้อมูล...</p>
  </div>
</template>
