<script setup>
import { Loader2, CheckCircle2 } from 'lucide-vue-next'

defineProps({
  count: Number,
  loading: Boolean
})
defineEmits(['confirm', 'cancel'])
</script>

<template>
  <div v-if="count > 0" class="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-6 z-50 animate-in slide-in-from-bottom-5 fade-in">
    <div class="flex items-center gap-3 border-r border-gray-700 pr-6">
      <div class="bg-blue-600 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">{{ count }}</div>
      <span class="font-medium">รายการที่เลือก</span>
    </div>
    <button @click="$emit('confirm')" :disabled="loading" class="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold shadow-sm flex items-center gap-2 disabled:opacity-50">
      <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
      <CheckCircle2 v-else class="w-4 h-4" /> ตรวจสอบงานทั้งหมด
    </button>
    <button @click="$emit('cancel')" class="text-gray-400 hover:text-white underline text-sm">ยกเลิก</button>
  </div>
</template>