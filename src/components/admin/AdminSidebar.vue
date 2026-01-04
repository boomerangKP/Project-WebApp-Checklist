<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { 
  LayoutDashboard, 
  ClipboardList, 
  FileText, 
  Users, 
  Menu,
  Settings,
  ChevronDown, 
  ChevronRight,
  MapPin,      
  ListChecks,
  Printer   
} from 'lucide-vue-next'

const route = useRoute()
const isCollapsed = ref(false)
const expandedMenus = ref({ 'ตั้งค่าระบบ': true })

const toggleSubmenu = (name) => {
  if (isCollapsed.value) {
    isCollapsed.value = false
    expandedMenus.value[name] = true
  } else {
    expandedMenus.value[name] = !expandedMenus.value[name]
  }
}

// ข้อมูลเมนู
const menuItems = [
  { name: 'ภาพรวมระบบ', path: '/admin', icon: LayoutDashboard },
  { name: 'ตรวจสอบงาน', path: '/admin/check', icon: ClipboardList },
  { name: 'รายงานผล', path: '/admin/report', icon: FileText },
  { name: 'จัดการพนักงาน', path: '/admin/employees', icon: Users },
  
  // 🔥 เมนูแบบ Tree
  { 
    name: 'ตั้งค่าระบบ', 
    icon: Settings,
    children: [
      { name: 'จัดการสถานที่', path: '/admin/locations', icon: MapPin }, 
      { name: 'รายการตรวจสอบ', path: '/admin/checklists', icon: ListChecks },
      { name: 'ดาวโหลด QR Code', path: '/admin/qrcodeprinter', icon: Printer }
    ]
  },
]
</script>

<template>
  <aside 
    class="bg-[#0f172a] text-white flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out h-screen sticky top-0 border-r border-gray-800 z-50 font-noto"
    :class="isCollapsed ? 'w-20' : 'w-64'"
  >
      
    <div class="h-16 flex items-center bg-[#0f172a] border-b border-gray-800 overflow-hidden shrink-0"
         :class="isCollapsed ? 'justify-center px-0' : 'px-6'">
      
      <button 
        @click="isCollapsed = !isCollapsed" 
        class="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors focus:outline-none"
        :class="{ 'mr-3': !isCollapsed }"
      >
        <Menu class="w-5 h-5" />
      </button>

      <div v-show="!isCollapsed" class="leading-tight whitespace-nowrap transition-opacity duration-300">
        <div class="text-xs font-medium text-gray-500 uppercase tracking-wider">ส่วนผู้ดูแล (Admin)</div>
        <div class="text-base font-bold text-white tracking-wide">ระบบจัดการแม่บ้าน</div>
      </div>
    </div>

    <nav class="flex-1 py-6 px-3 space-y-1 overflow-y-auto custom-scrollbar">
      <div v-for="item in menuItems" :key="item.name">
        
        <router-link 
          v-if="!item.children"
          :to="item.path"
          class="flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 group whitespace-nowrap relative mb-1"
          :class="[
            route.path === item.path 
              ? 'bg-[#38b6ff] text-white font-bold shadow-md shadow-blue-500/20'  /* 🔥 Active: สีฟ้า */
              : 'text-gray-400 hover:bg-gray-800/50 hover:text-[#38b6ff]',       /* 🔥 Hover: ตัวหนังสือฟ้า */
            isCollapsed ? 'justify-center px-2' : ''
          ]"
        >
          <component 
            :is="item.icon" 
            class="w-5 h-5 flex-shrink-0 transition-transform duration-200"
            :class="[
               !isCollapsed ? 'mr-3' : '',
               route.path === item.path ? 'text-white' : 'text-gray-500 group-hover:text-[#38b6ff]' /* 🔥 Icon เปลี่ยนตาม */
            ]"
          />
          <span v-show="!isCollapsed" class="transition-opacity duration-300">{{ item.name }}</span>
          
          <div v-if="isCollapsed" class="absolute left-14 bg-gray-900 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap border border-gray-700 shadow-xl">
            {{ item.name }}
          </div>
        </router-link>

        <div v-else class="mb-1">
          <button 
            @click="toggleSubmenu(item.name)"
            class="w-full flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 group whitespace-nowrap text-gray-400 hover:bg-gray-800/50 hover:text-[#38b6ff] relative"
            :class="[
              item.children.some(child => child.path === route.fullPath) ? 'text-white' : '',
              isCollapsed ? 'justify-center px-2' : ''
            ]"
          >
            <component 
              :is="item.icon" 
              class="w-5 h-5 flex-shrink-0 transition-colors"
              :class="[
                 !isCollapsed ? 'mr-3' : '',
                 expandedMenus[item.name] ? 'text-[#38b6ff]' : 'text-gray-500 group-hover:text-[#38b6ff]' /* 🔥 Icon แม่เป็นสีฟ้าเมื่อเปิด */
              ]" 
            />
            
            <div v-show="!isCollapsed" class="flex-1 flex justify-between items-center transition-opacity duration-300">
              <span :class="expandedMenus[item.name] ? 'font-medium text-white' : ''">{{ item.name }}</span>
              <component 
                :is="expandedMenus[item.name] ? ChevronDown : ChevronRight" 
                class="w-4 h-4 text-gray-600 transition-transform duration-200 group-hover:text-[#38b6ff]" 
              />
            </div>
          </button>

          <div 
            v-if="item.children && expandedMenus[item.name] && !isCollapsed" 
            class="mt-1 ml-5 pl-4 relative space-y-1 animate-in slide-in-from-top-1 duration-200"
          >
            <router-link 
              v-for="(child, index) in item.children" 
              :key="child.path"
              :to="child.path"
              class="flex items-center py-2 px-4 rounded-lg text-sm transition-all duration-200 relative group"
              :class="route.fullPath === child.path 
                ? 'bg-gray-800/80 text-[#38b6ff] font-bold shadow-sm border-l-2 border-[#38b6ff]' /* 🔥 ลูก Active: ตัวหนังสือฟ้า + แถบข้าง */
                : 'text-gray-400 hover:text-white hover:bg-gray-800/30'"
            >
              <div 
                class="absolute -left-4 top-0 w-4 h-1/2 border-l border-b border-gray-700 rounded-bl-xl pointer-events-none"
                :class="index === 0 ? 'top-[-8px] h-[calc(50%+8px)]' : ''" 
              ></div>
              <div v-if="index !== item.children.length - 1" class="absolute -left-4 top-1/2 bottom-0 w-px bg-gray-700 pointer-events-none"></div>
              <div v-if="index === 0" class="absolute -left-4 -top-2 h-3 w-px bg-gray-700 pointer-events-none"></div>

              <component 
                v-if="child.icon" 
                :is="child.icon" 
                class="w-4 h-4 mr-2 relative z-10 flex-shrink-0"
                :class="route.fullPath === child.path ? 'text-[#38b6ff]' : 'text-gray-500 group-hover:text-gray-300'"
              />

              <span class="relative z-10">{{ child.name }}</span>
            </router-link>
          </div>
        </div>

      </div>
    </nav>
  </aside>
</template>

<style scoped>
.font-noto { font-family: 'Noto Sans Thai', sans-serif; }
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
</style>