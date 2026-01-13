<script setup>
import { ref, reactive, onUnmounted, watch, computed } from 'vue'
import {
  Search, Filter, ListFilter, CheckSquare, Square,
  RotateCcw, Calendar, Users, CheckCircle2, XCircle, Clock,
  X, GripHorizontal, ChevronDown, ArrowRight
} from 'lucide-vue-next'

const props = defineProps({
  activeTab: String,
  searchQuery: String,
  selectedMaid: String,
  maids: { type: Array, default: () => [] },
  isSelectionMode: Boolean,
  isAllSelected: Boolean,
  waitingCount: Number,
  startDate: String,
  endDate: String
})

const emit = defineEmits([
  'update:activeTab', 'update:searchQuery', 'update:selectedMaid',
  'toggleSelectionMode', 'toggleSelectAll', 'refresh',
  'update:startDate', 'update:endDate'
])

// --- State ---
const isMenuOpen = ref(false)
const modalRef = ref(null)

// ตำแหน่งเริ่มต้น
const position = reactive({ top: 100, left: 0 })
let isDragging = false
let dragOffset = { x: 0, y: 0 }

// --- 📅 Logic ปฏิทิน ---
const dateRange = ref('today') // ค่าเริ่มต้นเป็น 'วันนี้'
const customStart = ref(new Date().toISOString().slice(0, 10))
const customEnd = ref(new Date().toISOString().slice(0, 10))
const startInputRef = ref(null)
const endInputRef = ref(null)

// ฟังก์ชันแปลงวันที่แสดงผล
const displayThaiDate = (isoDate) => {
  if (!isoDate) return '-'
  const date = new Date(isoDate)
  return date.toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: '2-digit'
  })
}

// ฟังก์ชันเปิดปฏิทิน
const openStartCalendar = () => {
  if (startInputRef.value?.showPicker) startInputRef.value.showPicker()
}
const openEndCalendar = () => {
  if (endInputRef.value?.showPicker) endInputRef.value.showPicker()
}

// คำนวณวันที่อัตโนมัติเมื่อเลือก Dropdown
watch(dateRange, (newVal) => {
  if (newVal === 'custom') return

  const end = new Date()
  const start = new Date()

  if (newVal === 'today') {
    // วันนี้
  } else if (newVal === 'yesterday') {
    start.setDate(start.getDate() - 1)
    end.setDate(end.getDate() - 1)
  } else if (newVal === 'week') {
    start.setDate(start.getDate() - 6)
  } else if (newVal === 'month') {
    start.setDate(1)
  }
  // ❌ ลบเงื่อนไข 'all' ออกแล้ว

  // ส่งค่ากลับไป
  emit('update:startDate', start.toISOString().slice(0, 10))
  emit('update:endDate', end.toISOString().slice(0, 10))
})

// Watch กรณี Custom Date เปลี่ยน
watch([customStart, customEnd], () => {
  if (dateRange.value === 'custom') {
    emit('update:startDate', customStart.value)
    emit('update:endDate', customEnd.value)
  }
})

// --- Logic เปิด/ปิด Menu ---
const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
  if (isMenuOpen.value) {
    const width = Math.min(window.innerWidth * 0.9, 350)
    position.left = (window.innerWidth - width) / 2
    position.top = 100
  }
}

// --- Logic การลาก (Drag) ---
const startDrag = (e) => {
  if (!modalRef.value) return
  isDragging = true
  const rect = modalRef.value.getBoundingClientRect()
  dragOffset.x = e.clientX - rect.left
  dragOffset.y = e.clientY - rect.top
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

const onDrag = (e) => {
  if (!isDragging) return
  position.left = e.clientX - dragOffset.x
  position.top = e.clientY - dragOffset.y
}

const stopDrag = () => {
  isDragging = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between bg-white p-2 rounded-xl border border-gray-200 shadow-sm gap-3">

      <div class="flex overflow-x-auto custom-scrollbar gap-2 flex-1 min-w-0 items-center">
        <button
          v-for="tab in [
            { id: 'waiting', label: 'รอตรวจสอบ', icon: Clock },
            { id: 'approved', label: 'ตรวจแล้ว', icon: CheckCircle2 },
            { id: 'rejected', label: 'แก้ไข', icon: XCircle },
            { id: 'all', label: 'ทั้งหมด', icon: ListFilter }
          ]"
          :key="tab.id"
          @click="$emit('update:activeTab', tab.id)"
          class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap border shrink-0"
          :class="activeTab === tab.id
            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
            : 'bg-white border-transparent text-gray-500 hover:bg-gray-50'"
        >
          <component :is="tab.icon" class="w-4 h-4" />
          <span>{{ tab.label }}</span>
          <span v-if="tab.id === 'waiting' && waitingCount > 0" class="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-red-100 text-red-600 font-bold">
            {{ waitingCount }}
          </span>
        </button>
      </div>

      <div class="flex items-center gap-2 flex-none">
         <button @click="$emit('refresh')" class="h-10 w-10 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 shadow-sm">
            <RotateCcw class="w-4 h-4" />
         </button>

         <button
           @click="toggleMenu"
           class="flex items-center gap-2 px-4 h-10 bg-indigo-600 text-white rounded-lg shadow-sm active:scale-95 transition-all hover:bg-indigo-700"
         >
           <Filter class="w-4 h-4" />
           <span class="text-sm font-bold hidden sm:inline">ตัวกรอง</span>
           <div v-if="isMenuOpen || dateRange !== 'today' || searchQuery || selectedMaid !== 'all'" class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
         </button>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="isMenuOpen">

        <div class="fixed inset-0 z-[9990] bg-black/5" @click="isMenuOpen = false"></div>

        <div
          ref="modalRef"
          class="fixed z-[9999] bg-white rounded-xl shadow-2xl border border-gray-300 w-[350px] max-w-[95vw] flex flex-col overflow-hidden"
          :style="{ top: `${position.top}px`, left: `${position.left}px` }"
        >

          <div
            @mousedown="startDrag"
            class="bg-gray-100 px-4 py-3 border-b border-gray-200 flex justify-between items-center cursor-move select-none"
            title="คลิกค้างเพื่อลาก"
          >
            <div class="flex items-center gap-2 text-gray-700 font-bold">
              <GripHorizontal class="w-5 h-5 text-gray-400" />
              <span>ค้นหาและกรอง</span>
            </div>
            <button @mousedown.stop @click="isMenuOpen = false" class="text-gray-400 hover:text-red-500 hover:bg-white rounded-full p-1 transition-all">
              <X class="w-5 h-5" />
            </button>
          </div>

          <div class="p-4 space-y-4">

            <div class="space-y-1">
               <label class="text-xs font-bold text-gray-500">ช่วงเวลา</label>

               <div class="relative w-full">
                  <select v-model="dateRange" class="w-full h-10 pl-3 pr-8 rounded-lg border border-gray-200 bg-gray-50 text-xs focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer">
                    <option value="today">วันนี้</option>
                    <option value="yesterday">เมื่อวาน</option>
                    <option value="week">7 วันล่าสุด</option>
                    <option value="month">เดือนนี้</option>
                    <option value="custom">กำหนดเอง...</option>
                  </select>
                  <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
               </div>

               <div v-if="dateRange === 'custom'" class="flex items-center gap-2 mt-2 p-2 bg-gray-50 border border-gray-100 rounded-lg animate-in slide-in-from-top-1">

                  <div class="relative flex-1 cursor-pointer group" @click="openStartCalendar">
                     <div class="flex items-center gap-2 px-2 py-1.5 bg-white border border-gray-200 rounded-md group-hover:border-indigo-300 transition-colors">
                        <Calendar class="w-3.5 h-3.5 text-indigo-500" />
                        <span class="text-xs text-gray-700">{{ displayThaiDate(customStart) }}</span>
                     </div>
                     <input ref="startInputRef" type="date" v-model="customStart" class="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>

                  <ArrowRight class="w-3 h-3 text-gray-400" />

                  <div class="relative flex-1 cursor-pointer group" @click="openEndCalendar">
                     <div class="flex items-center gap-2 px-2 py-1.5 bg-white border border-gray-200 rounded-md group-hover:border-indigo-300 transition-colors">
                        <Calendar class="w-3.5 h-3.5 text-indigo-500" />
                        <span class="text-xs text-gray-700">{{ displayThaiDate(customEnd) }}</span>
                     </div>
                     <input ref="endInputRef" type="date" v-model="customEnd" class="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
               </div>
            </div>

            <div class="space-y-1">
               <label class="text-xs font-bold text-gray-500">พนักงาน</label>
               <div class="relative">
                 <select :value="selectedMaid" @input="$emit('update:selectedMaid', $event.target.value)" class="w-full h-10 pl-3 pr-8 rounded-lg border border-gray-200 bg-gray-50 text-xs appearance-none focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer">
                    <option value="all">พนักงานทุกคน</option>
                    <option v-for="maid in maids" :key="maid" :value="maid">{{ maid }}</option>
                 </select>
                 <Users class="absolute right-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
               </div>
            </div>

            <div class="space-y-1">
               <label class="text-xs font-bold text-gray-500">ค้นหา</label>
               <div class="relative">
                 <Search class="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                 <input type="text" :value="searchQuery" @input="$emit('update:searchQuery', $event.target.value)" placeholder="ระบุคำค้นหา..." class="w-full h-10 pl-9 rounded-lg border border-gray-200 bg-gray-50 text-xs focus:ring-2 focus:ring-indigo-500 outline-none" />
               </div>
            </div>

            <div class="pt-3 border-t border-gray-100 flex gap-2">
               <button v-if="activeTab === 'waiting'" @click="$emit('toggleSelectionMode')" class="flex-1 h-10 rounded-lg border flex items-center justify-center gap-2 bg-white transition-colors" :class="isSelectionMode ? 'border-indigo-500 text-indigo-600 bg-indigo-50' : 'border-gray-200 text-gray-600 hover:bg-gray-50'">
                 <CheckSquare class="w-4 h-4" /> {{ isSelectionMode ? 'ยกเลิก' : 'เลือกรายการ' }}
               </button>
               <button v-if="isSelectionMode" @click="$emit('toggleSelectAll')" class="flex-1 h-10 rounded-lg border border-gray-200 text-gray-600 flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
                 <Square class="w-4 h-4" /> เลือกทั้งหมด
               </button>
            </div>

            <button @click="isMenuOpen = false" class="w-full h-10 bg-indigo-600 text-white rounded-lg font-bold text-sm shadow-md hover:bg-indigo-700 active:scale-95 transition-all">
               เสร็จสิ้น / ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { height: 0px; background: transparent; }
</style>
