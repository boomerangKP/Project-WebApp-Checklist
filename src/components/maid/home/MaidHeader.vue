<script setup>
import { LogOut, ShieldCheck, SprayCan, User } from 'lucide-vue-next'

defineProps({
  user: Object
})

// ประกาศว่า component นี้จะส่งสัญญาณชื่อ 'logout' ออกไป
const emit = defineEmits(['logout'])

// ✅ ปรับปรุงให้รองรับทุก Role
const getRoleLabel = (role) => {
  const r = role ? role.toLowerCase() : 'user';
  if (r === "admin") return "ผู้ดูแลระบบ";
  if (r === "maid") return "แม่บ้าน";
  if (r === "cleaner") return "พนักงานทำความสะอาด";
  return "พนักงานทั่วไป";
};

// ✅ Helper: เลือกไอคอนและสีตาม Role
const getRoleConfig = (role) => {
  const r = role ? role.toLowerCase() : 'user';
  switch (r) {
    case 'admin':
      return { type: 'icon', icon: ShieldCheck, class: 'bg-purple-100 text-purple-600' };
    case 'maid':
      return { type: 'icon', icon: SprayCan, class: 'bg-rose-100 text-rose-600' };
    case 'cleaner':
      // ✅ ไม้กวาด + พื้นหลังสีเทา ตามธีมที่ตั้งไว้
      return { type: 'emoji', icon: '🧹', class: 'bg-gray-200 text-2xl' };
    default:
      return { type: 'icon', icon: User, class: 'bg-gray-100 text-gray-500' };
  }
};
</script>

<template>
  <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between relative overflow-hidden">

    <div class="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full blur-3xl -mr-10 -mt-10 opacity-60 pointer-events-none"></div>

    <div class="flex items-center gap-4 relative z-10">
      <div class="h-14 w-14 rounded-full overflow-hidden border-2 border-white shadow-md bg-gray-100 flex-shrink-0 ring-2 ring-gray-50">
        <img v-if="user?.employees_photo" :src="user.employees_photo" class="h-full w-full object-cover" />
        
        <div v-else 
             class="h-full w-full flex items-center justify-center"
             :class="getRoleConfig(user?.role).class"
        >
             <span v-if="getRoleConfig(user?.role).type === 'emoji'" class="leading-none pt-1">
                {{ getRoleConfig(user?.role).icon }}
             </span>

             <component v-else :is="getRoleConfig(user?.role).icon" class="w-7 h-7" />
        </div>
      </div>

      <div>
        <h1 class="text-lg font-bold text-gray-800 leading-tight">
          {{ user?.employees_firstname || "..." }} {{ user?.employees_lastname || "" }}
        </h1>
        <div class="flex items-center gap-1 mt-0.5">
          <span class="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-md">
            {{ getRoleLabel(user?.role) }}
          </span>
        </div>
      </div>
    </div>

    <button
      @click="$emit('logout')" 
      class="p-2.5 rounded-xl bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all active:scale-95 border border-transparent hover:border-red-100 relative z-10"
    >
      <LogOut class="w-5 h-5" />
    </button>
  </div>
</template>