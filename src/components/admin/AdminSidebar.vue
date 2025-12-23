<script setup>
import { ref } from 'vue' // อย่าลืม import ref
import { useRoute } from 'vue-router'
import { 
  LayoutDashboard, 
  ClipboardList, 
  FileText, 
  Users, 
  Menu
} from 'lucide-vue-next'

const route = useRoute()

// 1. ตัวแปรเก็บสถานะ (false = ขยายปกติ, true = ย่อ)
const isCollapsed = ref(false)

const menuItems = [
  { name: 'Dashboard Overviews', path: '/admin', icon: LayoutDashboard },
  { name: 'ตรวจสอบงาน', path: '/admin/check', icon: ClipboardList },
  { name: 'รายงาน', path: '/admin/report', icon: FileText },
  { name: 'จัดการพนักงาน', path: '/admin/employees', icon: Users },
]
</script>

<template>
  <aside 
    class="bg-[#0f172a] text-white flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out"
    :class="isCollapsed ? 'w-20' : 'w-64'"
  >
      
    <div class="h-16 flex items-center bg-[#0f172a] border-b border-gray-700 overflow-hidden"
         :class="isCollapsed ? 'justify-center px-0' : 'px-4'">
      
      <button 
        @click="isCollapsed = !isCollapsed" 
        class="p-2 rounded hover:bg-gray-800 transition-colors focus:outline-none"
        :class="{ 'mr-2': !isCollapsed }"
      >
        <Menu class="w-6 h-6 text-white" />
      </button>

      <div v-show="!isCollapsed" class="leading-tight whitespace-nowrap transition-opacity duration-300">
        <div class="text-sm font-light text-gray-400">Admin</div>
        <div class="text-lg font-semibold tracking-wide">Control Panel</div>
      </div>
    </div>

    <nav class="flex-1 py-4 space-y-1 overflow-x-hidden">
      <router-link 
        v-for="item in menuItems" 
        :key="item.path"
        :to="item.path"
        class="flex items-center py-3 mx-2 rounded-lg transition-colors group whitespace-nowrap"
        :class="[
          route.path === item.path ? 'bg-white text-slate-900 font-bold shadow-md' : 'text-gray-300 hover:bg-gray-800 hover:text-white',
          isCollapsed ? 'justify-center px-0' : 'px-4'
        ]"
      >
        <component 
          :is="item.icon" 
          class="w-5 h-5 flex-shrink-0" 
          :class="{ 'mr-3': !isCollapsed }" 
        />
        
        <span v-show="!isCollapsed" class="transition-opacity duration-300">
          {{ item.name }}
        </span>
      </router-link>
    </nav>
  </aside>
</template>