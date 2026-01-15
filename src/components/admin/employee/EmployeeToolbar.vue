<script setup>
import { Search, UserPlus } from 'lucide-vue-next'

defineProps({
  searchQuery: String,
  roleFilter: String,
  statusFilter: String
})

const emit = defineEmits(['update:searchQuery', 'update:roleFilter', 'update:statusFilter', 'add'])
</script>

<template>
  <div class="bg-white p-4 border-b border-gray-100 flex flex-col md:flex-row gap-3 justify-between items-center">
    
    <div class="relative w-full md:w-72 lg:w-80 shrink-0">
      <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search class="h-4 w-4 text-gray-400" />
      </span>
      <input 
        :value="searchQuery"
        @input="$emit('update:searchQuery', $event.target.value)"
        type="text" 
        class="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" 
        placeholder="ค้นหาชื่อ, รหัส หรือ เบอร์โทร" 
      />
    </div>

    <div class="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
      
      <div class="grid grid-cols-2 sm:flex sm:flex-row gap-2 w-full sm:w-auto">
        <select 
          :value="roleFilter"
          @change="$emit('update:roleFilter', $event.target.value)"
          class="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
        >
          <option value="all">ทุกตำแหน่ง</option>
          <option value="admin">ผู้ดูแลระบบ</option>
          <option value="maid">แม่บ้าน</option>
          <option value="cleaner">พนักงานทำความสะอาด</option>
          <option value="user">พนักงานทั่วไป</option>
        </select>

        <select 
          :value="statusFilter"
          @change="$emit('update:statusFilter', $event.target.value)"
          class="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
        >
          <option value="all">ทุกสถานะ</option>
          <option value="active">ปกติ</option>
          <option value="inactive">ไม่เคลื่อนไหว</option>
          <option value="suspended">ระงับ</option>
        </select>
      </div>

      <button 
        @click="$emit('add')" 
        class="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold shadow-sm transition-colors text-sm whitespace-nowrap"
      >
        <UserPlus class="w-4 h-4" />
        เพิ่มพนักงาน
      </button>
    </div>
  </div>
</template>