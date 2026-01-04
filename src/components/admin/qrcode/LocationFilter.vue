<script setup>
import { Search, Building, Layers, X } from 'lucide-vue-next'

const props = defineProps({
  search: String,
  building: String,
  floor: String,
  uniqueBuildings: Array,
  uniqueFloors: Array
})

const emit = defineEmits(['update:search', 'update:building', 'update:floor', 'reset'])
</script>

<template>
  <div class="flex flex-col md:flex-row gap-4 items-center mb-6 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
    
    <div class="relative w-full md:w-72">
      <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        :value="search"
        @input="$emit('update:search', $event.target.value)"
        type="text"
        placeholder="ค้นหาชื่อ, รหัส..."
        class="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
      >
    </div>

    <div class="relative w-full md:w-auto">
      <div class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <Building class="w-4 h-4 text-gray-400" />
      </div>
      <select
        :value="building"
        @change="$emit('update:building', $event.target.value)"
        class="w-full md:w-40 py-2 pl-9 pr-8 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none transition-all"
      >
        <option value="">ทุกอาคาร</option>
        <option v-for="b in uniqueBuildings" :key="b" :value="b">{{ b }}</option>
      </select>
    </div>

    <div class="relative w-full md:w-auto">
      <div class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <Layers class="w-4 h-4 text-gray-400" />
      </div>
      <select
        :value="floor"
        @change="$emit('update:floor', $event.target.value)"
        :disabled="!building"
        class="w-full md:w-auto py-2 pl-9 pr-8 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none disabled:bg-gray-100 disabled:text-gray-400 transition-all"
      >
        <option value="">{{ building ? 'ทุกชั้น' : 'เลือกอาคารก่อน' }}</option>
        <option v-for="f in uniqueFloors" :key="f" :value="f">{{ f }}</option>
      </select>
    </div>

    <button 
      v-if="search || building || floor"
      @click="$emit('reset')" 
      class="ml-auto md:ml-0 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1"
    >
      <X class="w-3 h-3" /> ล้างตัวกรอง
    </button>

  </div>
</template>