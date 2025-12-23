<script setup>
import { computed } from 'vue' // เพิ่ม computed เพื่อคำนวณ %
import { LayoutDashboard, Clock, CheckCircle2, Users } from 'lucide-vue-next'

const props = defineProps({
  stats: {
    type: Object,
    required: true,
    default: () => ({ total: 0, pending: 0, completed: 0, activeStaff: 0 })
  }
})

// คำนวณ % ความสำเร็จ (ป้องกันการหารด้วย 0)
const completionRate = computed(() => {
  if (!props.stats.total || props.stats.total === 0) return 0
  return Math.round((props.stats.completed / props.stats.total) * 100)
})

// คำนวณ % งานที่ค้างอยู่
const pendingRate = computed(() => {
  if (!props.stats.total || props.stats.total === 0) return 0
  return Math.round((props.stats.pending / props.stats.total) * 100)
})
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    
    <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between">
      <div>
        <div class="flex items-center gap-2 mb-2">
          <div class="p-2 bg-blue-100 rounded-lg text-blue-600"><LayoutDashboard class="w-5 h-5" /></div>
          <span class="text-sm font-medium text-gray-500">Total Tasks</span>
        </div>
        <div class="text-3xl font-bold text-gray-900">{{ stats.total }}</div>
        <div class="text-xs text-gray-400 mt-1">จุดตรวจทั้งหมด (เป้าหมาย)</div>
      </div>
    </div>

    <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between">
      <div>
         <div class="flex items-center gap-2 mb-2">
          <div class="p-2 bg-yellow-100 rounded-lg text-yellow-600"><Clock class="w-5 h-5" /></div>
          <span class="text-sm font-medium text-gray-500">Pending Tasks</span>
        </div>
        <div class="text-3xl font-bold text-gray-900">{{ stats.pending }}</div>
         <div class="text-xs text-orange-500 mt-1">
           • เหลืออีก {{ pendingRate }}% ของงาน
         </div>
      </div>
    </div>

    <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between">
      <div>
         <div class="flex items-center gap-2 mb-2">
          <div class="p-2 bg-green-100 rounded-lg text-green-600"><CheckCircle2 class="w-5 h-5" /></div>
          <span class="text-sm font-medium text-gray-500">Completed Tasks</span>
        </div>
        <div class="text-3xl font-bold text-gray-900">{{ stats.completed }}</div>
        <div class="text-xs text-green-600 mt-1">
          ▲ เสร็จแล้ว {{ completionRate }}%
        </div>
      </div>
    </div>

    <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between">
      <div>
         <div class="flex items-center gap-2 mb-2">
          <div class="p-2 bg-indigo-100 rounded-lg text-indigo-600"><Users class="w-5 h-5" /></div>
          <span class="text-sm font-medium text-gray-500">Active Staff</span>
        </div>
        <div class="text-3xl font-bold text-gray-900">{{ stats.activeStaff }}</div>
        <div class="text-xs text-indigo-600 mt-1">• คน (กำลังปฏิบัติงาน)</div>
      </div>
    </div>

  </div>
</template>