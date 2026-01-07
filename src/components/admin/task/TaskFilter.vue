<script setup>
import { ref, reactive, onUnmounted } from 'vue'
import { 
  Search, Filter, ListFilter, CheckSquare, Square, 
  RotateCcw, Calendar, Users, CheckCircle2, XCircle, Clock,
  X, GripHorizontal // ไอคอนสำหรับจับลาก
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

defineEmits([
  'update:activeTab', 'update:searchQuery', 'update:selectedMaid',
  'toggleSelectionMode', 'toggleSelectAll', 'refresh',
  'update:startDate', 'update:endDate'
])

// --- State ---
const isMenuOpen = ref(false)
const modalRef = ref(null)

// ตำแหน่งเริ่มต้น (ตั้งค่าเริ่มต้นให้ว่างไว้ เดี๋ยวคำนวณตอนเปิด)
const position = reactive({ top: 100, left: 0 }) 
let isDragging = false
let dragOffset = { x: 0, y: 0 }

// --- Logic เปิด/ปิด ---
const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
  if (isMenuOpen.value) {
    // รีเซ็ตตำแหน่งให้อยู่ตรงกลางจอ (Center)
    const width = Math.min(window.innerWidth * 0.9, 350)
    position.left = (window.innerWidth - width) / 2
    position.top = 100
  }
}

// --- Logic การลาก (Drag) ---
const startDrag = (e) => {
  if (!modalRef.value) return
  isDragging = true
  // คำนวณจุดที่เมาส์จับเทียบกับมุมกล่อง
  const rect = modalRef.value.getBoundingClientRect()
  dragOffset.x = e.clientX - rect.left
  dragOffset.y = e.clientY - rect.top
  
  // เพิ่ม Event Listener ระดับ Document เพื่อให้ลากได้ลื่นๆ แม้ออกนอกกล่อง
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

const onDrag = (e) => {
  if (!isDragging) return
  // อัปเดตตำแหน่ง
  position.left = e.clientX - dragOffset.x
  position.top = e.clientY - dragOffset.y
}

const stopDrag = () => {
  isDragging = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// Cleanup
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
            { id: 'approved', label: 'ผ่าน', icon: CheckCircle2 },
            { id: 'rejected', label: 'ไม่ผ่าน', icon: XCircle },
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
           <div v-if="isMenuOpen" class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
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
               <div class="flex gap-2">
                 <input type="date" :value="startDate" @input="$emit('update:startDate', $event.target.value)" class="w-full h-10 rounded-lg border border-gray-200 bg-gray-50 text-xs px-2 focus:ring-2 focus:ring-indigo-500 outline-none" />
                 <input type="date" :value="endDate" @input="$emit('update:endDate', $event.target.value)" class="w-full h-10 rounded-lg border border-gray-200 bg-gray-50 text-xs px-2 focus:ring-2 focus:ring-indigo-500 outline-none" />
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