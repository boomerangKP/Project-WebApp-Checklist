<script setup>
import { Search, User, X, CheckSquare, Square, RotateCcw } from 'lucide-vue-next'

defineProps({
  activeTab: String,
  searchQuery: String,
  selectedMaid: String,
  maids: Array,
  isSelectionMode: Boolean,
  isAllSelected: Boolean,
  waitingCount: Number
})

const emit = defineEmits([
  'update:activeTab', 
  'update:searchQuery', 
  'update:selectedMaid', 
  'toggleSelectionMode', 
  'toggleSelectAll',
  'refresh'
])
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      
      <div class="relative w-full md:w-64">
        <User class="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <select 
          :value="selectedMaid" 
          @input="$emit('update:selectedMaid', $event.target.value)"
          class="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer appearance-none shadow-sm transition-shadow"
        >
          <option value="all">พนักงานทั้งหมด</option>
          <option v-for="name in maids" :key="name" :value="name">{{ name }}</option>
        </select>
        <div class="absolute right-3 top-3 pointer-events-none text-gray-400 text-xs">▼</div>
      </div>

      <button 
        @click="$emit('refresh')" 
        class="flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all text-sm font-medium border border-transparent hover:border-indigo-100"
        title="โหลดข้อมูลใหม่"
      >
        <RotateCcw class="w-4 h-4" />
        <span>รีเฟรชข้อมูล</span>
      </button>

    </div>

    <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
      
      <div class="flex space-x-2 overflow-x-auto w-full lg:w-auto p-1">
        <button v-for="tab in ['waiting', 'all', 'approved', 'rejected']" :key="tab" 
           @click="$emit('update:activeTab', tab)" 
           class="px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
           :class="activeTab === tab ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200' : 'text-gray-500 hover:bg-gray-50'">
          {{ tab === 'all' ? 'ทั้งหมด' : (tab === 'waiting' ? 'รอตรวจสอบ' : (tab === 'approved' ? 'ตรวจสอบแล้ว' : 'ส่งกลับแก้ไข')) }}
        </button>
      </div>

      <div class="flex items-center gap-3 w-full lg:w-auto">
        
        <div v-if="activeTab === 'waiting'" class="flex items-center gap-2">
           <button @click="$emit('toggleSelectionMode')" class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all"
             :class="isSelectionMode ? 'bg-gray-100 text-gray-800' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'">
             <span v-if="!isSelectionMode">เลือกรายการ</span>
             <span v-else class="flex items-center gap-2"><X class="w-4 h-4"/> ปิดโหมดเลือก</span>
           </button>

           <button v-if="isSelectionMode" @click="$emit('toggleSelectAll')" :disabled="waitingCount === 0"
             class="flex items-center gap-2 px-4 py-2 border border-indigo-200 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 disabled:opacity-50 transition-colors">
             <CheckSquare v-if="isAllSelected" class="w-4 h-4" />
             <Square v-else class="w-4 h-4" />
             เลือกทั้งหมด ({{ waitingCount }})
           </button>
        </div>

        <div class="relative w-full lg:w-64">
          <Search class="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input 
            :value="searchQuery" 
            @input="$emit('update:searchQuery', $event.target.value)"
            type="text" class="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:ring-indigo-500 outline-none transition-shadow" placeholder="ค้นหา..." 
          />
        </div>
      </div>
    </div>
  </div>
</template>