<script setup>
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

defineProps({
  currentPage: Number,
  totalPages: Number,
  startEntry: Number,
  endEntry: Number,
  totalItems: Number,
  itemsPerPage: Number
})

const emit = defineEmits(['update:itemsPerPage', 'changePage'])
</script>

<template>
  <div class="px-6 py-4 border-t border-gray-100 bg-white flex flex-col sm:flex-row gap-4 items-center justify-between">
    <div class="flex items-center gap-4 text-sm text-gray-600">
      <span>แสดง {{ startEntry }} ถึง {{ endEntry }} จาก {{ totalItems }} รายการ</span>
      <div class="flex items-center gap-2">
        <span>แสดง:</span>
        <select 
          :value="itemsPerPage" 
          @change="$emit('update:itemsPerPage', Number($event.target.value))"
          class="border border-gray-300 rounded-md text-sm py-1 px-2 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
        >
          <option :value="5">5</option>
          <option :value="10">10</option>
          <option :value="20">20</option>
          <option :value="30">30</option>
          <option :value="50">50</option>
        </select>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <button @click="$emit('changePage', currentPage - 1)" :disabled="currentPage === 1" class="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600">
        <ChevronLeft class="w-4 h-4" />
      </button>
      <div class="flex items-center gap-1">
        <button v-for="page in totalPages" :key="page" @click="$emit('changePage', page)" class="w-8 h-8 rounded-lg text-sm font-medium transition-colors" :class="currentPage === page ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'" v-show="Math.abs(page - currentPage) <= 1 || page === 1 || page === totalPages">
          <span v-if="Math.abs(page - currentPage) > 1 && page !== 1 && page !== totalPages">...</span>
          <span v-else>{{ page }}</span>
        </button>
      </div>
      <button @click="$emit('changePage', currentPage + 1)" :disabled="currentPage === totalPages" class="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600">
        <ChevronRight class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>