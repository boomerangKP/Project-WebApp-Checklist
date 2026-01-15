<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useUserStore } from '@/stores/user'
import Notification from '@/components/admin/NotificationBell.vue'
import { useSwal } from '@/composables/useSwal'
// ✅ เพิ่ม ShieldCheck เข้ามา
import { Menu, LogOut, ShieldCheck } from 'lucide-vue-next'

const route = useRoute()
const userStore = useUserStore()
const { swalConfirm } = useSwal()

// ✅ Logic การแสดงชื่อหน้า (Breadcrumb แบบง่าย)
const pageTitle = computed(() => {
  const name = route.name || ''
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
    default: return 'ระบบบริหารจัดการสุขอนามัยอาคาร'
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
          <button
            @click="onLogoutClick"
            class="text-xs text-red-500 hover:text-red-700 underline flex items-center justify-end w-full gap-1"
          >
            Logout
            <LogOut class="w-3 h-3" />
          </button>
        </div>

        <div class="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center overflow-hidden border border-indigo-100 shadow-sm">
           <ShieldCheck class="w-6 h-6 text-indigo-600" />
        </div>

      </div>

    </div>

  </header>
</template>
