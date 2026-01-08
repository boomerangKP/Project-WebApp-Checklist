<script setup>
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useUserStore } from '@/stores/user'
import { Loader2 } from 'lucide-vue-next'
import Swal from 'sweetalert2'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

onMounted(async () => {
  const token = route.params.token

  // แสดง Loading (ใช้แบบ HTML เพื่อความสวยงาม)
  Swal.fire({
    title: 'กำลังตรวจสอบ...',
    html: '<div class="text-sm text-gray-500">ระบบกำลังระบุตำแหน่งและสิทธิ์การใช้งาน</div>',
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  })

  try {
    // 1. ค้นหา Location ID จาก Token
    const { data: location, error } = await supabase
      .from('locations')
      .select('locations_id, locations_name')
      .eq('token', token)
      .single()

    if (error || !location) {
      throw new Error('ไม่พบข้อมูลสถานที่')
    }

    // 2. เช็คว่าเป็นใคร? (แม่บ้าน หรือ ลูกค้า)
    const { data: { session } } = await supabase.auth.getSession()

    let userRole = null

    // ถ้ามี Session ให้เช็ค Role ต่อ
    if (session) {
       // ถ้ามี Role ใน Store แล้วก็ใช้เลย
       if (userStore.profile?.role) {
          userRole = userStore.profile.role
       } else {
          // ถ้าไม่มี ให้ Fetch ใหม่เพื่อความชัวร์
          const { data: profile } = await supabase
            .from('employees')
            .select('role')
            .eq('email', session.user.email)
            .single()

          if (profile) {
            userRole = profile.role
            // อัปเดต Store ไว้ด้วย
            userStore.setProfile({ ...userStore.profile, role: profile.role })
          }
       }
    }

    Swal.close()

    // 3. แยกทางเดินรถ (Traffic Control) 🔥
    if (session && userRole === 'maid') {
      // ✅ กรณี 1: เป็นแม่บ้าน -> ไปหน้าส่งงาน
      router.replace({
        name: 'maid-job',
        params: { id: location.locations_id }
      })
    } else {
      // ✅ กรณี 2: เป็นลูกค้า หรือไม่ได้ Login -> ไปหน้าประเมินความพึงพอใจ
      router.replace({
        name: 'feedback',
        params: { id: location.locations_id }
      })
    }

  } catch (err) {
    console.error('Scan Error:', err)

    await Swal.fire({
      icon: 'error',
      title: 'ไม่สามารถระบุสถานที่ได้',
      text: 'QR Code นี้อาจถูกยกเลิก หรือข้อมูลไม่ถูกต้อง',
      confirmButtonText: 'กลับหน้าหลัก',
      confirmButtonColor: '#4f46e5'
    })

    // ดีดกลับหน้าแรก
    router.replace('/')
  }
})
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-400">
     <div class="animate-pulse flex flex-col items-center">
        <Loader2 class="w-12 h-12 text-indigo-500 animate-spin mb-4" />
        <p class="text-sm font-medium">กำลังนำทาง...</p>
     </div>
  </div>
</template>
