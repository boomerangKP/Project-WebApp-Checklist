<script setup>
import { ref, computed, watch } from 'vue'
import { MapPin, CheckSquare, Square, Loader2, ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  locations: Array,
  loading: Boolean,
  selectedIds: Set
})

const emit = defineEmits(['toggle', 'toggle-all'])

// --- ⚡ ส่วน Pagination State (รวมไว้ที่นี่เลย) ---
const currentPage = ref(1)
const itemsPerPage = ref(10)

// รีเซ็ตหน้าเมื่อข้อมูลเปลี่ยน
watch(() => props.locations, () => {
  currentPage.value = 1
})

// --- 🧮 Logic คำนวณการตัดแบ่งหน้า ---
const totalPages = computed(() => Math.ceil(props.locations.length / itemsPerPage.value) || 1)

const paginatedLocations = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return props.locations.slice(start, end)
})

const startItem = computed(() => props.locations.length === 0 ? 0 : (currentPage.value - 1) * itemsPerPage.value + 1)
const endItem = computed(() => Math.min(currentPage.value * itemsPerPage.value, props.locations.length))

// --- 🔢 Logic สร้างปุ่มตัวเลข (1 ... 4 5 6 ... 10) ---
const visiblePages = computed(() => {
  const pages = []
  const total = totalPages.value
  const current = currentPage.value

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    if (current > 3) pages.push('...')
    let start = Math.max(2, current - 1)
    let end = Math.min(total - 1, current + 1)
    if (current <= 3) end = 4
    if (current >= total - 2) start = total - 3
    for (let i = start; i <= end; i++) pages.push(i)
    if (current < total - 2) pages.push('...')
    pages.push(total)
  }
  return pages
})

const changePage = (page) => {
  if (page === '...') return
  if (page >= 1 && page <= totalPages.value) currentPage.value = page
}

const isAllSelected = computed(() => {
  return props.locations.length > 0 &&
         props.locations.every(l => props.selectedIds.has(l.locations_id))
})
</script>

<template>
  <div class="flex-1 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">

    <div class="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider items-center flex-shrink-0">
      <div class="col-span-1 flex justify-center">
        <button @click="$emit('toggle-all')" class="hover:text-indigo-600 transition-colors" title="เลือกทั้งหมด">
          <component :is="isAllSelected ? CheckSquare : Square" class="w-5 h-5" :class="isAllSelected ? 'text-indigo-600' : 'text-gray-400'" />
        </button>
      </div>
      <div class="col-span-2">รหัสสถานที่</div>
      <div class="col-span-5">ชื่อจุดตรวจ</div>
      <div class="col-span-2 text-center">อาคาร</div>
      <div class="col-span-2 text-center">ชั้น</div>
    </div>

    <div class="overflow-y-auto custom-scrollbar flex-1 relative">
      <div v-if="loading" class="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10">
        <Loader2 class="w-8 h-8 animate-spin mb-2 text-indigo-500" />
        <p class="text-gray-500 text-sm">กำลังโหลดข้อมูล...</p>
      </div>

      <div v-else-if="locations.length === 0" class="flex flex-col items-center justify-center h-full text-gray-400 min-h-[200px]">
        <MapPin class="w-12 h-12 mb-2 opacity-20" />
        <p>ไม่พบสถานที่</p>
      </div>

      <div v-else>
        <div
          v-for="loc in paginatedLocations"
          :key="loc.locations_id"
          @click="$emit('toggle', loc.locations_id)"
          class="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-100 hover:bg-indigo-50/50 cursor-pointer transition-colors items-center group"
          :class="selectedIds.has(loc.locations_id) ? 'bg-indigo-50/80' : ''"
        >
          <div class="col-span-1 flex justify-center">
            <component
              :is="selectedIds.has(loc.locations_id) ? CheckSquare : Square"
              class="w-5 h-5 transition-colors"
              :class="selectedIds.has(loc.locations_id) ? 'text-indigo-600' : 'text-gray-300 group-hover:text-indigo-400'"
            />
          </div>
          <div class="col-span-2 font-mono text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded w-fit group-hover:bg-white group-hover:text-indigo-600 transition-colors">
            {{ loc.locations_code }}
          </div>
          <div class="col-span-5 font-medium text-gray-800">
            {{ loc.locations_name }}
          </div>
          <div class="col-span-2 text-center text-sm text-gray-600">
            {{ loc.locations_building }}
          </div>
          <div class="col-span-2 text-center text-sm text-gray-600">
            {{ loc.locations_floor }}
          </div>
        </div>
      </div>
    </div>

    <div class="border-t border-gray-200 bg-white flex-shrink-0 z-10 py-2 px-4 flex flex-col sm:flex-row items-center justify-between gap-4 select-none" v-if="locations.length > 0">

      <div class="flex flex-wrap items-center gap-4 text-sm text-gray-600">
        <span class="whitespace-nowrap">
          แสดง <span class="font-bold text-gray-900">{{ startItem }}</span>
          ถึง <span class="font-bold text-gray-900">{{ endItem }}</span>
          จาก <span class="font-bold text-gray-900">{{ locations.length }}</span> รายการ
        </span>

        <div class="flex items-center gap-2">
          <span>แสดง:</span>
          <select
            v-model="itemsPerPage"
            @change="currentPage = 1"
            class="border border-gray-300 rounded-md py-1 px-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer bg-white text-gray-900 shadow-sm min-w-[60px]"
          >
            <option :value="5">5</option>
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="30">30</option>
            <option :value="50">50</option>
          </select>
        </div>
      </div>

      <div class="flex items-center gap-1">
        <button
          @click="changePage(currentPage - 1)"
          :disabled="currentPage === 1"
          class="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>

        <button
          v-for="(page, index) in visiblePages"
          :key="index"
          @click="changePage(page)"
          class="w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-all"
          :class="[
            page === currentPage
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 border border-indigo-600'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300',
            page === '...' ? 'border-none bg-transparent cursor-default text-gray-400 hover:bg-transparent' : ''
          ]"
        >
          {{ page }}
        </button>

        <button
          @click="changePage(currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>

    </div>

  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
</style>
