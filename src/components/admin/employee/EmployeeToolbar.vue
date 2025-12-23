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
  <div class="bg-white p-5 border-b border-gray-100 flex flex-col lg:flex-row gap-4 justify-between items-center">
    
    <div class="relative w-full lg:w-96">
      <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search class="h-4 w-4 text-gray-400" />
      </span>
      <input 
        :value="searchQuery"
        @input="$emit('update:searchQuery', $event.target.value)"
        type="text" 
        class="block w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" 
        placeholder="ค้นหาชื่อ, รหัส หรือ เบอร์โทรศัพท์" 
      />
    </div>

    <div class="flex flex-wrap items-center gap-3 w-full lg:w-auto">
      
      <select 
        :value="roleFilter"
        @change="$emit('update:roleFilter', $event.target.value)"
        class="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
      >
        <option value="all">ทุกตำแหน่ง</option>
        <option value="maid">แม่บ้าน</option>
        <option value="admin">ผู้ดูแลระบบ</option>
      </select>

      <select 
        :value="statusFilter"
        @change="$emit('update:statusFilter', $event.target.value)"
        class="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
      >
        <option value="all">ทุกสถานะ</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>

      <button 
        @click="$emit('add')" 
        class="flex items-center gap-2 px-4 py-2.5 bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-lg font-bold shadow-sm transition-colors text-sm ml-auto lg:ml-0"
      >
        <UserPlus class="w-4 h-4" />
        เพิ่มพนักงาน
      </button>
    </div>
  </div>
</template>