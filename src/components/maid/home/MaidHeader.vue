<script setup>
import { LogOut, Star } from 'lucide-vue-next' // (แถม) เอาไอคอนดาวมาใส่ให้ดูโปร

defineProps({
  user: Object
})

defineEmits(['logout'])

const getRoleLabel = (role) => {
  if (role === "maid") return "พนักงานทำความสะอาด";
  if (role === "admin") return "ผู้ดูแลระบบ";
  return "พนักงานทั่วไป";
};
</script>

<template>
  <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between relative overflow-hidden">

    <div class="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full blur-3xl -mr-10 -mt-10 opacity-60 pointer-events-none"></div>

    <div class="flex items-center gap-4 relative z-10">
      <div class="h-14 w-14 rounded-full overflow-hidden border-2 border-white shadow-md bg-gray-100 flex-shrink-0 ring-2 ring-gray-50">
        <img v-if="user?.employees_photo" :src="user.employees_photo" class="h-full w-full object-cover" />
        <div v-else class="h-full w-full flex items-center justify-center text-2xl">🧹</div>
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
