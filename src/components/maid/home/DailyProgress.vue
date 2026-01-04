<script setup>
import { computed } from 'vue'
import { Loader2, CheckCircle2, Clock, ListTodo } from 'lucide-vue-next'

const props = defineProps({
  stats: {
    type: Object,
    // กำหนดค่า Default ให้ครบ เพื่อกัน Error
    default: () => ({ total: 0, waiting: 0, completed: 0, rejected: 0 })
  },
  loading: Boolean
})

// ✅ คำนวณ % โดยป้องกันการหารด้วยศูนย์ (NaN)
const progressPercent = computed(() => {
  const total = Number(props.stats?.total || 0)
  const waiting = Number(props.stats?.waiting || 0)
  const completed = Number(props.stats?.completed || 0)

  if (total === 0) return 0
  const percent = ((waiting + completed) / total) * 100
  return isNaN(percent) ? 0 : percent
})

// คำนวณความกว้างหลอดเขียว
const widthCompleted = computed(() => {
  const total = Number(props.stats?.total || 0)
  const val = Number(props.stats?.completed || 0)
  return total === 0 ? 0 : (val / total) * 100
})

// คำนวณความกว้างหลอดเหลือง
const widthWaiting = computed(() => {
  const total = Number(props.stats?.total || 0)
  const val = Number(props.stats?.waiting || 0)
  return total === 0 ? 0 : (val / total) * 100
})
</script>

<template>
  <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden h-full flex flex-col justify-between">

    <div v-if="loading" class="absolute inset-0 bg-white/90 flex items-center justify-center z-20">
      <Loader2 class="w-8 h-8 animate-spin text-indigo-500" />
    </div>

    <div class="flex justify-between items-end mb-4">
      <div>
        <h2 class="text-lg font-bold text-gray-800">สรุปงานวันนี้</h2>
        <p class="text-xs text-gray-500">ความคืบหน้าล่าสุด</p>
      </div>
      <div class="text-right">
        <span class="text-2xl font-black text-indigo-600">
          {{ Math.round(progressPercent) || 0 }}%
        </span>
      </div>
    </div>

    <div class="h-3 w-full bg-gray-100 rounded-full overflow-hidden flex mb-5">
      <div
        class="h-full bg-emerald-500 transition-all duration-500"
        :style="{ width: `${widthCompleted}%` }"
      ></div>
      <div
        class="h-full bg-amber-400 transition-all duration-500"
        :style="{ width: `${widthWaiting}%` }"
      ></div>
    </div>

    <div class="grid grid-cols-3 gap-2 text-center">

      <div class="bg-gray-50 rounded-xl p-2 border border-gray-100 flex flex-col items-center justify-center min-h-[80px]">
        <ListTodo class="w-5 h-5 text-gray-400 mb-1" />
        <div class="text-lg font-bold text-gray-800 leading-none mb-1">
          {{ props.stats?.total || 0 }}
        </div>
        <div class="text-[10px] text-gray-500">ส่งแล้วทั้งหมด</div>
      </div>

      <div class="bg-amber-50 rounded-xl p-2 border border-amber-100 flex flex-col items-center justify-center min-h-[80px]">
        <Clock class="w-5 h-5 text-amber-500 mb-1" />
        <div class="text-lg font-bold text-amber-600 leading-none mb-1">
          {{ props.stats?.waiting || 0 }}
        </div>
        <div class="text-[10px] text-amber-600">รอตรวจ</div>
      </div>

      <div class="bg-emerald-50 rounded-xl p-2 border border-emerald-100 flex flex-col items-center justify-center min-h-[80px]">
        <CheckCircle2 class="w-5 h-5 text-emerald-500 mb-1" />
        <div class="text-lg font-bold text-emerald-600 leading-none mb-1">
          {{ props.stats?.completed || 0 }}
        </div>
        <div class="text-[10px] text-emerald-600">ผ่านแล้ว</div>
      </div>

    </div>
  </div>
</template>
