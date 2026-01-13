<script setup>
import { CheckCircle2, XCircle, Camera, FileText } from 'lucide-vue-next'

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

      <div class="mt-1">
        <label class="text-xs text-gray-400 flex items-center gap-1 mb-1">
          <FileText class="w-3 h-3" /> หมายเหตุ / รายละเอียดเพิ่มเติม
        </label>
        <textarea
          v-model="item.detail"
          rows="2"
          placeholder="ระบุรายละเอียด (เช่น ก๊อกน้ำรั่ว, สบู่หมด)..."
          class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-400 resize-none"
        ></textarea>
      </div>

      <div class="flex items-center justify-between pt-3 border-t border-gray-50 gap-3">
        <button @click="emit('toggle', index)"
          class="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl transition-all active:scale-95 shadow-sm border"
          :class="item.status === 'pass'
            ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
            : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'">
          <component :is="item.status === 'pass' ? CheckCircle2 : XCircle" class="w-5 h-5" />
          <span class="font-bold">{{ item.status === 'pass' ? 'เรียบร้อย' : 'มีปัญหา' }}</span>
        </button>

      </div>

    </div>
  </div>
</template>
