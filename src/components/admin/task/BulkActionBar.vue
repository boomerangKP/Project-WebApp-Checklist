<script setup>
import { Loader2, CheckCircle2 } from 'lucide-vue-next'

defineProps({
  count: Number,
  loading: Boolean
})
defineEmits(['confirm', 'cancel'])
</script>

<template>
  <Transition
    enter-active-class="transition ease-out duration-300"
    enter-from-class="opacity-0 translate-y-full"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition ease-in duration-200"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-full"
  >
    <div 
      v-if="count > 0" 
      class="fixed bottom-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-auto sm:bottom-6 bg-gray-900/95 backdrop-blur-sm text-white px-4 py-3 sm:px-6 sm:py-4 rounded-xl shadow-2xl flex items-center justify-between sm:justify-center gap-3 sm:gap-6 z-50 ring-1 ring-white/10"
    >
      <div class="flex items-center gap-3 border-r border-gray-700 pr-4 sm:pr-6 shrink-0">
        <div class="bg-indigo-500 w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shadow-lg shadow-indigo-500/30">
          {{ count }}
        </div>
        <div class="flex flex-col sm:flex-row sm:gap-1 leading-none">
          <span class="font-medium text-sm">รายการ</span>
          <span class="text-[10px] sm:text-sm text-gray-400 sm:text-white font-normal sm:font-medium">ที่เลือก</span>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <button 
          @click="$emit('cancel')" 
          class="text-gray-400 hover:text-white underline text-sm whitespace-nowrap px-1"
        >
          ยกเลิก
        </button>
        
        <button 
          @click="$emit('confirm')" 
          :disabled="loading" 
          class="bg-green-600 hover:bg-green-500 text-white px-3 py-2 sm:px-4 rounded-lg font-bold shadow-sm flex items-center gap-2 disabled:opacity-50 text-sm whitespace-nowrap transition-transform active:scale-95"
        >
          <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
          <CheckCircle2 v-else class="w-4 h-4" />
          <span>ตรวจสอบ<span class="hidden sm:inline">งานทั้งหมด</span></span>
        </button>
      </div>
    </div>
  </Transition>
</template>