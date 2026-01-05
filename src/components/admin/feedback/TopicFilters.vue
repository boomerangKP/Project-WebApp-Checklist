<script setup>
import { Search, X, Filter } from 'lucide-vue-next'

defineProps({
  search: String,
  status: String
})

defineEmits(['update:search', 'update:status', 'reset'])
</script>

<template>
  <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-center">
    
    <div class="relative flex-1 w-full">
      <Search class="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
      <input 
        type="text" 
        :value="search"
        @input="$emit('update:search', $event.target.value)"
        placeholder="ค้นหาชื่อหัวข้อ หรือ คำอธิบาย..." 
        class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
      >
    </div>

    <div class="w-full md:w-48">
      <div class="relative">
        <Filter class="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
        <select 
          :value="status"
          @change="$emit('update:status', $event.target.value)"
          class="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
        >
          <option value="all">สถานะทั้งหมด</option>
          <option value="active">ใช้งานอยู่ (Active)</option>
          <option value="inactive">ปิดใช้งาน (Inactive)</option>
        </select>
        <div class="absolute right-3 top-3 pointer-events-none text-gray-400 text-xs">▼</div>
      </div>
    </div>

    <button 
      @click="$emit('reset')"
      class="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
      title="ล้างค่าค้นหา"
    >
      <X class="w-5 h-5" />
    </button>

  </div>
</template>