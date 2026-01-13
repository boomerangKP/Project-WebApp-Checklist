<script setup>
import { CheckCircle2, Clock, AlertCircle, UserCheck } from 'lucide-vue-next'

// รับข้อมูล item มาจากหน้าหลัก
const props = defineProps({
  item: Object
})

// --- Helpers: แปลงวันที่เป็นไทย ---
const formatThaiDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)

  // จัดรูปแบบเวลา เช่น 14:30 น.
  const timeStr = date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.'

  // ถ้าเป็นวันนี้ หรือเมื่อวาน ให้แสดงคำอ่านง่ายๆ
  if (date.toDateString() === now.toDateString()) return `วันนี้ ${timeStr}`
  if (date.toDateString() === yesterday.toDateString()) return `เมื่อวาน ${timeStr}`

  // ถ้าวันอื่น แสดงวันที่เต็ม
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) + ' ' + timeStr
}

const getStatusConfig = (status) => {
  switch (status) {
    case 'pass':
    case 'fixed':
    case 'approved':
      return { barColor: 'bg-green-500', badgeBg: 'bg-green-500', text: 'ตรวจแล้ว', icon: CheckCircle2 }
    case 'fail':
    case 'rejected':
      return { barColor: 'bg-red-600', badgeBg: 'bg-red-600', text: 'แก้ไข', icon: AlertCircle }
    default:
      return { barColor: 'bg-orange-500', badgeBg: 'bg-orange-500', text: 'รอตรวจ', icon: Clock }
  }
}
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm overflow-hidden flex min-h-[100px] relative animate-in fade-in slide-in-from-bottom-2 duration-300">

    <div class="w-4 flex-shrink-0" :class="getStatusConfig(item.check_sessions_status).barColor">
        <div class="w-1 h-4 bg-white/30 rounded-full mx-auto mt-8"></div>
    </div>

    <div class="flex-1 p-3 flex flex-col justify-center hover:bg-blue-50 cursor-pointer">
      <div class="flex justify-between items-start gap-2">
        <div>
          <h3 class="font-bold text-gray-800 text-sm md:text-base leading-tight">
            {{ item.locations?.locations_name }}
          </h3>
          <p class="text-xs text-gray-500 mt-1">
            {{ item.locations?.locations_building }} ชั้น {{ item.locations?.locations_floor }} ({{ item.restroom_types?.restroom_types_name }})
          </p>

          <p class="text-gray-600 font-medium text-xs mt-2 flex items-center gap-1">
             <Clock class="w-3 h-3 text-gray-400" />
             ส่งงาน: {{ formatThaiDate(item.created_at) }}
          </p>

          <p v-if="item.checked_at" class="text-indigo-600 font-bold text-xs mt-1 flex items-center gap-1">
             <UserCheck class="w-3 h-3" />
             ตรวจเมื่อ: {{ formatThaiDate(item.checked_at) }}
          </p>
        </div>

        <div class="flex items-center gap-1 px-3 py-1.5 rounded-full text-white text-xs font-bold shadow-sm whitespace-nowrap"
             :class="getStatusConfig(item.check_sessions_status).badgeBg">
          <component :is="getStatusConfig(item.check_sessions_status).icon" class="w-4 h-4" />
          <span>{{ getStatusConfig(item.check_sessions_status).text }}</span>
        </div>
      </div>

      <div v-if="['fail', 'rejected'].includes(item.check_sessions_status)"
           class="mt-2 text-xs text-red-500 font-medium bg-red-50 p-2 rounded-lg border border-red-100">
        เหตุผล: {{ item.supervisor_comment || item.check_sessions_notes || 'มีความสกปรก / อุปกรณ์ชำรุด' }}
      </div>
    </div>
  </div>
</template>
