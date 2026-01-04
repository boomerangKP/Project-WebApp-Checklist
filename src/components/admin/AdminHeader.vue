<script setup>
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useUserStore } from '@/stores/user'
import { Search } from 'lucide-vue-next'
import Notification from '@/components/admin/NotificationBell.vue'

// ✅ 1. Import useSwal เข้ามา
import { useSwal } from '@/composables/useSwal'

const router = useRouter()
const userStore = useUserStore()

// ✅ 2. เรียกใช้ฟังก์ชันจาก useSwal
const { swalConfirm, swalSuccess } = useSwal()

// ✅ 3. รวม Logic การ Logout ไว้ในฟังก์ชันเดียว
const onLogoutClick = async () => {
  // เรียก SweetAlert ถามยืนยัน
  const isConfirmed = await swalConfirm(
    'ยืนยันการออกจากระบบ?',       // Title
    'คุณต้องการออกจากระบบใช่หรือไม่', // Text
    'ออกจากระบบ',                 // Button Text
    'warning'                     // Icon สีเหลือง/แดง
  )

  if (isConfirmed) {
    try {
      // สั่ง Logout ที่ Supabase
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Logout error:', error)
    }

    // 🔥🔥🔥 ไม้ตาย: ล้างความจำ Browser ทิ้งให้เกลี้ยง! 🔥🔥🔥
    // แก้ปัญหา Chrome จำแม่นจนเด้งกลับหน้าเดิม
    localStorage.clear()
    sessionStorage.clear()

    // เคลียร์ Session ใน Store ของเรา
    userStore.clearSession()

    // แจ้งเตือนสวยๆ ก่อนไป (await เพื่อให้ User เห็นข้อความก่อน)
    // await swalSuccess('ออกจากระบบเรียบร้อย')

    // 🔥 ใช้ window.location.replace เพื่อบังคับรีโหลดใหม่
    window.location.replace('/login')
  }
}
</script>

<template>
  <header class="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-index">

    <div class="flex-1 max-w-md">
      <div class="relative">
        <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search class="h-5 w-5 text-gray-400" />
        </span>
        <input
          type="text"
          class="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg leading-5 bg-gray-100 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 sm:text-sm transition-all"
          placeholder="ค้นหา...."
        />
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

        <div class="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center overflow-hidden border border-gray-200">
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
