<script setup>
import { ref } from "vue";
import { useRoute } from "vue-router";
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
  Printer,
  MessageSquareQuote,
  UserCheck,
  Heart,
  Database,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-vue-next";

const route = useRoute();
const isCollapsed = ref(false); // เริ่มต้นแบบกางออก
const expandedMenus = ref({});

const handleMenuClick = (item) => {
  if (isCollapsed.value) {
    isCollapsed.value = false; // กางออกทันที
    if (item.children) {
      expandedMenus.value[item.name] = true; // เปิดลูกให้ด้วย
    }
  } else {
    if (item.children) {
      expandedMenus.value[item.name] = !expandedMenus.value[item.name];
    }
  }
};

const menuItems = [
  { name: "แดชบอร์ด", path: "/admin", icon: LayoutDashboard },
  { name: "ตรวจสอบงาน", path: "/admin/check", icon: ClipboardList },
  { name: "ข้อมูลพนักงาน", path: "/admin/employees", icon: Users },
  {
    name: "รายงานผล",
    icon: FileText,
    children: [
      { name: "ประวัติการทำงาน", path: "/admin/report", icon: UserCheck },
      { name: "คะแนนประเมิน", path: "/admin/satisfaction", icon: Heart },
    ],
  },
  {
    name: "จัดการข้อมูล",
    icon: Database,
    children: [
      { name: "สถานที่", path: "/admin/locations", icon: MapPin },
      { name: "รายการตรวจ ", path: "/admin/checklists", icon: ListChecks },
      { name: "หัวข้อประเมิน ", path: "/admin/editfeedback", icon: MessageSquareQuote },
      { name: "พิมพ์ QR Code ", path: "/admin/qrcodeprinter", icon: Printer },
    ],
  },
];
</script>

<template>
  <aside
    class="bg-[#0f172a] dark:bg-slate-900 text-white flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out h-screen sticky top-0 border-r border-gray-800 dark:border-slate-800 z-[999] font-noto"
    :class="isCollapsed ? 'w-20' : 'w-64'"
  >
    <div
      class="h-16 flex items-center bg-[#0f172a] dark:bg-slate-900 border-b border-gray-800 dark:border-slate-800 overflow-hidden shrink-0"
      :class="isCollapsed ? 'justify-center px-0' : 'px-6'"
    >
      <button
        @click="isCollapsed = !isCollapsed"
        class="p-1.5 rounded-lg hover:bg-gray-800 dark:hover:bg-slate-800 text-gray-400 hover:text-white transition-colors focus:outline-none"
        :class="{ 'mr-3': !isCollapsed }"
        :title="isCollapsed ? 'ขยายเมนู' : 'ย่อเมนู'"
      >
        <component :is="!isCollapsed ? PanelLeftClose : PanelLeftOpen" class="w-5 h-5" />
      </button>

      <div
        v-show="!isCollapsed"
        class="leading-tight whitespace-nowrap transition-opacity duration-300"
      >
        <div
          class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
        >
          ส่วนผู้ดูแล
        </div>
      </div>
    </div>

    <nav
      class="flex-1 py-6 px-3 space-y-1 custom-scrollbar"
      :class="isCollapsed ? 'overflow-visible' : 'overflow-y-auto'"
    >
      <div v-for="item in menuItems" :key="item.name" class="relative group">
        <router-link
          v-if="!item.children"
          :to="item.path"
          class="flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 whitespace-nowrap relative"
          :class="[
            route.path === item.path
              ? 'bg-[#38b6ff] text-white font-bold shadow-blue-500/20 shadow-md'
              : 'text-gray-400 dark:text-gray-400 hover:bg-gray-800 dark:hover:bg-slate-800 hover:text-[#38b6ff] dark:hover:text-[#38b6ff]',
            isCollapsed ? 'justify-center' : '',
          ]"
        >
          <component
            :is="item.icon"
            class="w-5 h-5 flex-shrink-0 transition-transform duration-200"
            :class="[
              !isCollapsed ? 'mr-3' : '',
              route.path === item.path ? 'text-white' : '',
            ]"
          />
          <span v-show="!isCollapsed">{{ item.name }}</span>

          <div
            v-if="isCollapsed"
            class="absolute left-14 top-1.5 bg-gray-900 dark:bg-slate-800 text-white text-xs px-3 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[1000] whitespace-nowrap border border-gray-700 dark:border-slate-700 shadow-xl"
          >
            {{ item.name }}
          </div>
        </router-link>

        <div v-else>
          <button
            @click="handleMenuClick(item)"
            class="w-full flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 whitespace-nowrap text-gray-400 dark:text-gray-400 hover:bg-gray-800 dark:hover:bg-slate-800 hover:text-[#38b6ff] dark:hover:text-[#38b6ff] relative"
            :class="[
              item.children.some((child) => child.path === route.fullPath)
                ? 'text-white'
                : '',
              isCollapsed ? 'justify-center' : '',
            ]"
          >
            <component
              :is="item.icon"
              class="w-5 h-5 flex-shrink-0"
              :class="[
                !isCollapsed ? 'mr-3' : '',
                expandedMenus[item.name] ? 'text-[#38b6ff]' : '',
              ]"
            />

            <div v-show="!isCollapsed" class="flex-1 flex justify-between items-center">
              <span :class="expandedMenus[item.name] ? 'font-medium text-white' : ''">{{
                item.name
              }}</span>
              <component
                :is="expandedMenus[item.name] ? ChevronDown : ChevronRight"
                class="w-4 h-4 text-gray-600 dark:text-gray-500"
              />
            </div>
          </button>

          <div
            v-if="isCollapsed"
            class="hidden group-hover:block absolute left-[70px] top-0 w-48 bg-[#1e293b] dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-700 dark:border-slate-700 p-2 z-[1000]"
          >
            <div
              class="px-3 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase border-b border-gray-700 dark:border-slate-700 mb-2"
            >
              {{ item.name }}
            </div>
            <router-link
              v-for="child in item.children"
              :key="child.path"
              :to="child.path"
              class="block px-3 py-2 rounded-lg text-sm text-gray-300 dark:text-gray-300 hover:text-white hover:bg-[#38b6ff] transition-colors mb-1"
              :class="
                route.fullPath === child.path ? 'bg-[#38b6ff] text-white font-bold' : ''
              "
            >
              {{ child.name }}
            </router-link>
          </div>

          <div
            v-if="item.children && expandedMenus[item.name] && !isCollapsed"
            class="mt-1 ml-5 pl-4 space-y-1 border-l border-gray-700 dark:border-slate-700"
          >
            <router-link
              v-for="child in item.children"
              :key="child.path"
              :to="child.path"
              class="flex items-center py-2 px-4 rounded-lg text-sm transition-all duration-200 relative"
              :class="
                route.fullPath === child.path
                  ? 'text-[#38b6ff] font-bold bg-gray-800/50 dark:bg-slate-800/50'
                  : 'text-gray-400 dark:text-gray-400 hover:text-white hover:bg-gray-800/30 dark:hover:bg-slate-800/30'
              "
            >
              {{ child.name }}
            </router-link>
          </div>
        </div>
      </div>
    </nav>
  </aside>
</template>

<style scoped>
.font-noto {
  font-family: "Noto Sans Thai", sans-serif;
}
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #334155;
  border-radius: 10px;
}
</style>
