<script setup>
import { ref, watch, computed } from 'vue'
import { Calendar as CalendarIcon, Search, ChevronDown, ArrowRight } from 'lucide-vue-next'

// ✅ 1. นำเข้าปุ่ม Export ที่เราสร้างไว้
import ExportReportButton from '@/components/admin/export/ExportReportButton.vue'

const props = defineProps(['loading'])
const emit = defineEmits(['update:range'])

const dateRange = ref('today')
const customStart = ref(new Date().toISOString().slice(0, 10))
const customEnd = ref(new Date().toISOString().slice(0, 10))
const startInputRef = ref(null)
const endInputRef = ref(null)

const displayThaiDate = (isoDate) => {
  if (!isoDate) return 'เลือกวันที่'
  const date = new Date(isoDate)
  return date.toLocaleDateString('th-TH', { 
    year: 'numeric', month: 'short', day: 'numeric', calendar: 'buddhist' 
  })
}

const openStartCalendar = () => {
  if (startInputRef.value?.showPicker) startInputRef.value.showPicker()
  else startInputRef.value?.focus()
}

const openEndCalendar = () => {
  if (endInputRef.value?.showPicker) endInputRef.value.showPicker()
  else endInputRef.value?.focus()
}

// ✅ 2. เพิ่ม Logic คำนวณวันที่จริง เพื่อส่งให้ปุ่ม Export
const computedDateRange = computed(() => {
  const end = new Date(); // เวลาปัจจุบัน
  const start = new Date();
  start.setHours(0, 0, 0, 0); // เริ่มต้นวัน 00:00
  end.setHours(23, 59, 59, 999); // สิ้นสุดวัน 23:59

  switch (dateRange.value) {
    case 'today':
      // ใช้วันนี้ (Default)
      break;
    case 'yesterday':
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
      break;
    case 'week':
      start.setDate(start.getDate() - 6); // 7 วันย้อนหลัง
      break;
    case 'month':
      start.setDate(1); // วันที่ 1 ของเดือนนี้
      break;
    case 'custom':
      // ถ้าเลือกกำหนดเอง ให้เอาค่าจาก Input มาใช้
      return { 
        start: customStart.value ? new Date(customStart.value).toISOString() : null, 
        end: customEnd.value ? new Date(customEnd.value + 'T23:59:59').toISOString() : null 
      };
  }

  return { start: start.toISOString(), end: end.toISOString() };
});

// ส่งค่ากลับไปให้หน้า Parent เพื่อแสดงผลบนหน้าเว็บ (กราฟ/ตาราง)
watch([dateRange, customStart, customEnd], () => {
  if (dateRange.value !== 'custom') {
    emit('update:range', { type: dateRange.value, ...computedDateRange.value })
  }
})

const handleCustomSearch = () => {
  emit('update:range', { type: 'custom', ...computedDateRange.value })
}
</script>

<template>
  <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-6">
    
    <div>
      <h1 class="text-2xl font-bold text-gray-800 tracking-tight">รายงานผลการปฏิบัติงาน</h1>
      <p class="text-gray-500 text-sm mt-1">สรุปข้อมูลย้อนหลังและสถิติการทำงาน</p>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      
      <div class="relative bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all h-11 min-w-[160px]">
        <select 
          v-model="dateRange" 
          class="appearance-none bg-transparent w-full h-full pl-4 pr-10 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <option value="today">วันนี้</option>
          <option value="yesterday">เมื่อวาน</option>
          <option value="week">7 วันล่าสุด</option>
          <option value="month">เดือนนี้</option>
          <option value="custom">กำหนดเอง...</option>
        </select>
        <ChevronDown class="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      <div v-if="dateRange === 'custom'" class="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm animate-in fade-in slide-in-from-right-4">
         
         <div class="relative group cursor-pointer" @click="openStartCalendar">
           <div class="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border border-transparent hover:border-indigo-200 rounded-lg px-3 py-1.5 transition-all">
             <CalendarIcon class="w-4 h-4 text-indigo-500" />
             <span class="text-sm font-medium text-gray-700 min-w-[80px] text-center">{{ displayThaiDate(customStart) }}</span>
           </div>
           <input ref="startInputRef" type="date" v-model="customStart" class="absolute bottom-0 left-0 w-0 h-0 opacity-0 pointer-events-none" />
         </div>

         <ArrowRight class="w-4 h-4 text-gray-300" />

         <div class="relative group cursor-pointer" @click="openEndCalendar">
           <div class="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border border-transparent hover:border-indigo-200 rounded-lg px-3 py-1.5 transition-all">
             <CalendarIcon class="w-4 h-4 text-indigo-500" />
             <span class="text-sm font-medium text-gray-700 min-w-[80px] text-center">{{ displayThaiDate(customEnd) }}</span>
           </div>
           <input ref="endInputRef" type="date" v-model="customEnd" class="absolute bottom-0 left-0 w-0 h-0 opacity-0 pointer-events-none" />
         </div>

         <button @click="handleCustomSearch" class="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg shadow-sm active:scale-95 ml-1 transition-all">
           <Search class="w-4 h-4" />
         </button>
      </div>

      <ExportReportButton 
        class="ml-auto sm:ml-0 h-11"
        :startDate="computedDateRange.start"
        :endDate="computedDateRange.end"
      />

    </div>
  </div>
</template>