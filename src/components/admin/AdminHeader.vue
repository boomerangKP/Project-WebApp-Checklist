<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useUserStore } from '@/stores/user'
import { Search } from 'lucide-vue-next' // ❌ เอา Bell ออก เพราะไปอยู่ใน component แล้ว
import LogoutConfirmModal from '@/components/ui/LogoutConfirmModal.vue'
import Notification from '@/components/admin/NotificationBell.vue'// ✅ 1. Import NotificationBell เข้ามา

const router = useRouter()
const userStore = useUserStore()
const showLogoutModal = ref(false)

const handleLogoutConfirm = async () => {
  await supabase.auth.signOut()
  userStore.clearSession()
  window.location.replace('/login')
}

const onLogoutClick = () => {
  showLogoutModal.value = true
}
</script>

<template>
  <header class="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-10">

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

      <Notification /> <!-- ✅ 2. ใช้ NotificationBell component ที่นี่ -->

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

    <LogoutConfirmModal
      v-model="showLogoutModal"
      @confirm="handleLogoutConfirm"
    />
  </header>
</template>
