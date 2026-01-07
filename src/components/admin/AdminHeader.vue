<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router' // ✅ เรียกใช้ route เพื่อดูว่าอยู่หน้าไหน
import { supabase } from '@/lib/supabase'
import { useUserStore } from '@/stores/user'
import Notification from '@/components/admin/NotificationBell.vue'
import { useSwal } from '@/composables/useSwal'
import { Menu } from 'lucide-vue-next' // เผื่อใช้ปุ่ม Menu บนมือถือ

const route = useRoute()
const userStore = useUserStore()
const { swalConfirm } = useSwal()

// ✅ Logic การแสดงชื่อหน้า (Breadcrumb แบบง่าย)
// ตรวจสอบจาก route.name หรือกำหนดเอง
const pageTitle = computed(() => {
  const name = route.name || ''

  // แปลงชื่อ Route เป็นภาษาไทย (ถ้า Route name คุณตั้งเป็นภาษาอังกฤษ)
  // หรือถ้า Route name เป็นไทยอยู่แล้วก็ใช้ name ได้เลย
  switch (name) {
    case 'admin-dashboard': return 'แดชบอร์ด'
    case 'check-tasks': return 'ตรวจสอบงาน'
    case 'admin-employees': return 'ข้อมูลพนักงาน'
    case 'admin-report': return 'รายงานผล'
    case 'admin-locations': return 'จัดการข้อมูล'
    case 'admin-checklists': return 'จัดการข้อมูล'
    case 'admin-qrcodeprinter': return 'จัดการข้อมูล'
    case 'report-satisfaction': return 'รายงานผล'
    case 'admin-editfeedback': return 'จัดการข้อมูล'
    // ... เพิ่ม case ตามชื่อ route ใน router/index.js ของคุณ
    default: return 'ระบบจัดการแม่บ้าน'
  }
})

// --- 🚪 Logout Logic ---
const onLogoutClick = async () => {
  const isConfirmed = await swalConfirm(
    'ยืนยันการออกจากระบบ?',
    'คุณต้องการออกจากระบบใช่หรือไม่',
    'ออกจากระบบ',
    'warning'
  )

  if (isConfirmed) {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Logout error:', error)
    }
    localStorage.clear()
    sessionStorage.clear()
    userStore.clearSession()
    window.location.replace('/login')
  }
}
</script>

<template>
  <header class="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-30 relative transition-all">

    <div class="flex items-center gap-4">
      <div>
        <h1 class="text-xl font-bold text-gray-800 tracking-tight">
          {{ pageTitle }}
        </h1>
        </div>
    </div>

    <div class="flex items-center space-x-6">

      <Notification />

      <div class="flex items-center border-l pl-6 border-gray-200">
        <div class="text-right mr-3 hidden sm:block">
          <div class="text-sm font-bold text-gray-800">
            {{ userStore.profile?.employees_firstname || 'Admin' }} {{ userStore.profile?.employees_lastname || '' }}
          </div>
          <button @click="onLogoutClick" class="text-xs text-red-500 hover:text-red-700 underline flex items-center justify-end w-full gap-1">
            Logout
          </button>
        </div>

        <div class="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center overflow-hidden border border-gray-200 shadow-sm">
          <img
            v-if="userStore.profile?.employees_photo"
            :src="userStore.profile.employees_photo"
            alt="Profile"
            class="h-full w-full object-cover"
          />
          <span v-else class="text-xl">🍌</span>
        </div>
      </div>

    </div>

  </header>
</template>
