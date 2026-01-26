<script setup>
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useUserStore } from '@/stores/user'
import { useJobChecks } from '@/composables/useJobChecks' // ✅ เรียกใช้ Logic กลาง
import { Loader2 } from 'lucide-vue-next'
import Swal from 'sweetalert2'
import dayjs from 'dayjs'
import 'dayjs/locale/th'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { checkExistingSession } = useJobChecks() // ✅ ดึงฟังก์ชันตรวจสอบมาใช้

onMounted(async () => {
  const token = route.params.token

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

    // 2. เช็ค User Role
    const { data: { session } } = await supabase.auth.getSession()
    let userRole = null

    if (session) {
       if (userStore.profile?.role) {
          userRole = userStore.profile.role
       } else {
          const { data: profile } = await supabase
            .from('employees')
            .select('role')
            .eq('email', session.user.email)
            .single()

          if (profile) {
            userRole = profile.role
            userStore.setProfile({ ...userStore.profile, role: profile.role })
          }
       }
    }

    // 3. แยกทางเดินรถ (Traffic Control)
    if (session && (userRole === 'maid' || userRole === 'cleaner')) {
      
      // ✅ 4. เช็คงานซ้ำก่อนอนุญาตให้เข้าหน้า Job (ใช้ Composable)
      // (Logic จะเหมือนกับ ManualEntry เป๊ะๆ เพื่อความสอดคล้อง)
      const { existingSession } = await checkExistingSession(location.locations_id)

      if (existingSession) {
        Swal.close() // ปิด Loading ก่อน

        const isMyWork = existingSession.employees_id === userStore.profile.employees_id
        
        // 🟢 Case 2 & 4: ถ้าเป็นงานตัวเอง และสถานะ Waiting/Rejected -> อนุญาตให้ไปหน้า Job เพื่อแก้ไขได้
        if (isMyWork && ['waiting', 'rejected'].includes(existingSession.check_sessions_status)) {
             // ปล่อยผ่านไปหน้า Job (หน้า Job จะมี Logic ดึงข้อมูลเก่ามาให้เอง)
             router.replace({ 
                name: 'maid-job', 
                params: { id: location.locations_id } 
             })
             return
        }

        // 🔴 Case 1 & 3: ถ้าเป็นงานคนอื่น หรือ งานตัวเองที่เสร็จแล้ว -> บล็อก!
        let empName = 'พนักงานท่านอื่น'
        if (existingSession.employees) {
            empName = `${existingSession.employees.employees_firstname} ${existingSession.employees.employees_lastname}`
        }
        if (isMyWork) empName = 'คุณ (บันทึกแล้ว)'

        const time = dayjs(existingSession.created_at).locale('th').format('HH:mm น.')
        
        const statusMap = {
            waiting: { text: 'รอตรวจสอบ', color: 'text-yellow-600 bg-yellow-50', icon: 'info' },
            approved: { text: 'ตรวจเสร็จสิ้นแล้ว (ผ่าน)', color: 'text-green-600 bg-green-50', icon: 'success' },
            rejected: { text: 'ถูกสั่งให้แก้ไขงาน', color: 'text-red-600 bg-red-50', icon: 'warning' }
        }
        const status = statusMap[existingSession.check_sessions_status] || { text: 'ไม่ทราบสถานะ', color: 'text-gray-600 bg-gray-50', icon: 'question' }

        await Swal.fire({
            title: 'งานนี้ถูกส่งไปแล้ว!',
            html: `
                <div class="flex flex-col gap-3 mt-2 text-left bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div class="text-sm text-gray-600">สถานที่: <span class="font-bold text-gray-800">${location.locations_name}</span></div>
                    <div class="text-sm text-gray-600">โดย: <span class="font-bold text-gray-800">${empName}</span></div>
                    <div class="text-sm text-gray-600">เวลา: <span class="font-bold text-gray-800">${time}</span></div>
                    <div class="mt-1"><span class="px-3 py-1 rounded-full text-xs font-bold border ${status.color}">${status.text}</span></div>
                </div>
            `,
            icon: status.icon,
            confirmButtonText: 'กลับหน้าหลัก',
            confirmButtonColor: '#4f46e5',
            allowOutsideClick: false
        })

        router.replace({ name: 'maid-home' })
        return
      }

      // ✅ ถ้าไม่ซ้ำ (Case ปกติ) -> ไปหน้าส่งงานเพื่อสร้างใหม่
      Swal.close()
      router.replace({ 
        name: 'maid-job', 
        params: { id: location.locations_id } 
      })

    } else {
      // ✅ กรณี 2: ลูกค้า / Guest / Admin -> ไปหน้า Feedback
      Swal.close()
      router.replace({ 
        name: 'feedback', 
        params: { id: location.locations_id } 
      })
    }

  } catch (err) {
    console.error('Scan Error:', err)
    Swal.close()

    await Swal.fire({
      icon: 'error',
      title: 'ไม่สามารถระบุสถานที่ได้',
      text: 'QR Code นี้อาจถูกยกเลิก หรือข้อมูลไม่ถูกต้อง',
      confirmButtonText: 'กลับหน้าหลัก',
      confirmButtonColor: '#4f46e5'
    })

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