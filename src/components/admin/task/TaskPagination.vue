<script setup>
import { ChevronLeft, ChevronRight } from "lucide-vue-next";

defineProps({
  currentPage: Number,
  totalPages: Number,
  startEntry: Number,
  endEntry: Number,
  totalItems: Number,
  itemsPerPage: Number,
});

defineEmits(["update:itemsPerPage", "changePage"]);
</script>

<template>
  <div
    class="flex flex-col sm:flex-row items-center justify-between gap-4 py-2 text-sm transition-colors duration-300 text-gray-600 dark:text-slate-400"
  >
    <div class="font-medium">
      แสดง {{ startEntry }} ถึง {{ endEntry }} จาก {{ totalItems }} รายการ
    </div>

    <div class="flex items-center gap-4">
      
      <div class="flex items-center gap-2">
        <span class="hidden sm:inline">แสดง</span>
        <select
          :value="itemsPerPage"
          @change="$emit('update:itemsPerPage', Number($event.target.value))"
          class="border border-gray-300 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-700 text-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
        >
          <option :value="100">100</option>
          <option :value="500">500</option>
          <option :value="1000">1000</option>
        </select>
        <span class="hidden sm:inline">รายการ</span>
      </div>

      <div class="flex items-center gap-1">
        <button
          @click="$emit('changePage', currentPage - 1)"
          :disabled="currentPage === 1"
          class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft class="w-5 h-5" />
        </button>

        <span class="font-medium text-gray-700 dark:text-white min-w-[3rem] text-center">
          หน้า {{ currentPage }} / {{ totalPages }}
        </span>

        <button
          @click="$emit('changePage', currentPage + 1)"
          :disabled="currentPage === totalPages || totalPages === 0"
          class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight class="w-5 h-5" />
        </button>
      </div>
    </div>
  </div>
</template>