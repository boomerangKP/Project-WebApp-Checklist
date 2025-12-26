<script setup>
import { CheckCircle2, XCircle, Camera } from 'lucide-vue-next'

defineProps({
  items: Array
})

const emit = defineEmits(['toggle', 'camera'])
</script>

<template>
  <div class="space-y-4">
    <h3 class="font-bold text-gray-700 px-1">รายการตรวจสอบ ({{ items.length }})</h3>
    
    <div v-for="(item, index) in items" :key="item.check_items_id" 
      class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3 transition-all"
      :class="item.status === 'fail' ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-green-500'">
      
      <div class="flex-1">
        <div class="font-bold text-gray-800 text-lg">{{ index + 1 }}. {{ item.check_items_name }}</div>
        <div class="text-sm text-gray-500 mt-1 leading-relaxed">{{ item.check_items_description }}</div>
      </div>

      <div class="flex items-center justify-between pt-2 border-t border-gray-50">
        <button @click="emit('toggle', index)" 
          class="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl transition-all active:scale-95"
          :class="item.status === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
          <component :is="item.status === 'pass' ? CheckCircle2 : XCircle" class="w-5 h-5" />
          <span class="font-bold">{{ item.status === 'pass' ? 'เรียบร้อย' : 'มีปัญหา' }}</span>
        </button>

        <button @click="emit('camera', index)" class="ml-3 p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 active:scale-95">
          <Camera class="w-5 h-5" />
        </button>
      </div>
    </div>
  </div>
</template>