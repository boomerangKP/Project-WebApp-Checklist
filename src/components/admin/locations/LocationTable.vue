<script setup>
import { ref, computed, watch } from 'vue'
import { Edit, Trash2, Loader2, Check, Copy, ChevronLeft, ChevronRight } from 'lucide-vue-next'

// --- Props & Emits ---
const props = defineProps({
  items: { type: Array, default: () => [] },
  loading: Boolean,
  highlightId: Number
})

const emit = defineEmits(['edit', 'delete'])

// --- 1. Pagination Logic (ระบบแบ่งหน้า) ---
const currentPage = ref(1)
const itemsPerPage = ref(10) // ค่าเริ่มต้น 10 รายการ

// เมื่อข้อมูลเปลี่ยน (เช่น กดค้นหา) ให้รีเซ็ตกลับไปหน้า 1
watch(() => props.items, () => {
  currentPage.value = 1
})

const totalItems = computed(() => props.items.length)
const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value) || 1)

const startIndex = computed(() => (currentPage.value - 1) * itemsPerPage.value)
const endIndex = computed(() => Math.min(startIndex.value + itemsPerPage.value, totalItems.value))

// ตัดข้อมูลเฉพาะหน้าปัจจุบันมาแสดง
const paginatedItems = computed(() => {
  return props.items.slice(startIndex.value, endIndex.value)
})

// คำนวณเลขหน้าที่จะแสดง (เช่น 1 2 ... 5)
const visiblePages = computed(() => {
  const pages = []
  const delta = 1
  if (totalPages.value <= 5) {
    for (let i = 1; i <= totalPages.value; i++) pages.push(i)
  } else {
    pages.push(1)
    if (currentPage.value > delta + 2) pages.push('...')
    for (let i = Math.max(2, currentPage.value - delta); i <= Math.min(totalPages.value - 1, currentPage.value + delta); i++) {
      pages.push(i)
    }
    if (currentPage.value < totalPages.value - delta - 1) pages.push('...')
    pages.push(totalPages.value)
  }
  return pages
})

const changePage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

// --- 2. Copy to Clipboard ---
const copiedId = ref(null)

const copyToClipboard = async (text, id) => {
  try {
    await navigator.clipboard.writeText(text)
    copiedId.value = id
    setTimeout(() => { copiedId.value = null }, 1500)
  } catch (err) {
    console.error('Failed to copy', err)
  }
}

// --- 3. Helper: Status Config (จัดการสีและข้อความสถานะ) ---
const getLocationStatusConfig = (status) => {
  switch (status) {
    case 'active':
      return {
        label: 'ปกติ',
        textClass: 'text-emerald-700',
        dotClass: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
      }
    case 'maintenance':
      return {
        label: 'ปิดปรับปรุง',
        textClass: 'text-orange-700',
        dotClass: 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]'
      }
    case 'inactive':
      return {
        label: 'ปิดใช้งาน',
        textClass: 'text-slate-500',
        dotClass: 'bg-slate-400'
      }
    default:
      return {
        label: status || '-',
        textClass: 'text-gray-400',
        dotClass: 'bg-gray-300'
      }
  }
}
</script>

<template>
  <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-320px)]">

    <div class="flex-1 overflow-y-auto overflow-x-auto relative custom-scrollbar">
      <table class="w-full text-left border-collapse">

        <thead class="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider shadow-sm">
          <tr>
            <th class="px-6 py-4 whitespace-nowrap min-w-[150px]">Code</th>
            <th class="px-6 py-4 whitespace-nowrap">ชื่อจุดตรวจ </th>
            <th class="px-6 py-4 text-center">อาคาร</th>
            <th class="px-6 py-4 text-center">ชั้น</th>
            <th class="px-6 py-4 text-center">ประเภท</th>
            <th class="px-6 py-4 text-center">สถานะ</th>
            <th class="px-6 py-4 text-right">จัดการ</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-gray-100">

          <tr v-if="loading">
            <td colspan="7" class="px-6 py-20 text-center text-gray-400">
              <div class="flex flex-col items-center justify-center h-full">
                 <Loader2 class="w-8 h-8 animate-spin mb-2 text-indigo-500" />
                 <span>กำลังโหลดข้อมูล...</span>
              </div>
            </td>
          </tr>

          <tr v-else-if="items.length === 0">
            <td colspan="7" class="px-6 py-20 text-center text-gray-400 bg-gray-50/30">
              ไม่พบข้อมูล
            </td>
          </tr>

          <tr v-for="item in paginatedItems" :key="item.locations_id"
              class="group transition-all duration-300 hover:bg-gray-50"
              :class="[item.locations_id === highlightId ? 'bg-emerald-50' : '']"
          >
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center gap-2">
                <button
                  @click="copyToClipboard(item.locations_code, item.locations_id)"
                  class="group/btn flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all duration-200"
                  :class="copiedId === item.locations_id
                    ? 'bg-emerald-100 border-emerald-200 text-emerald-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 shadow-sm'"
                  title="คลิกเพื่อคัดลอก"
                >
                  <span class="font-mono text-xs font-semibold tracking-wide">
                    {{ item.locations_code }}
                  </span>

                  <Check v-if="copiedId === item.locations_id" class="w-3 h-3" />
                  <Copy v-else class="w-3 h-3 opacity-30 group-hover/btn:opacity-100 transition-opacity" />
                </button>

                <span v-if="item.locations_id === highlightId" class="text-[10px] font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded-full animate-pulse shadow-sm">
                  NEW
                </span>
              </div>
            </td>

            <td class="px-6 py-4">
              <div class="font-medium text-gray-900 text-sm">{{ item.locations_name }}</div>
            </td>

            <td class="px-6 py-4 text-center">
              <div class="inline-flex items-center gap-1.5 px-2.5 py-1  text-gray-600 text-xs ">
                {{ item.locations_building }}
              </div>
            </td>

            <td class="px-6 py-4 text-center">
                <span class="inline-flex items-center justify-center  text-xs font-bold text-gray-700 ">
                  {{ item.locations_floor }}
                </span>
            </td>

            <td class="px-6 py-4 text-center">
              <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                {{ item.restroom_types?.restroom_types_name || '-' }}
              </span>
            </td>

            <td class="px-6 py-4 text-center">
              <div class="flex justify-center items-center gap-2">
                  <div class="w-2 h-2 rounded-full transition-all duration-300"
                       :class="getLocationStatusConfig(item.locations_status).dotClass">
                  </div>
                  <span class="text-xs font-medium transition-colors duration-300"
                        :class="getLocationStatusConfig(item.locations_status).textClass">
                    {{ getLocationStatusConfig(item.locations_status).label }}
                  </span>
              </div>
            </td>

            <td class="px-6 py-4 text-right">
              <div class="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                <button @click="$emit('edit', item)" class="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="แก้ไข">
                  <Edit class="w-4 h-4" />
                </button>
                <button @click="$emit('delete', item.locations_id)" class="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="ลบ">
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="!loading && totalItems > 0" class="border-t border-gray-200 p-2 bg-white z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600">

      <div class="flex flex-wrap items-center gap-4 justify-center sm:justify-start">
        <span class="whitespace-nowrap">
          แสดง <span class="font-semibold text-gray-900">{{ totalItems === 0 ? 0 : startIndex + 1 }}</span>
          ถึง <span class="font-semibold text-gray-900">{{ endIndex }}</span>
          จาก <span class="font-semibold text-gray-900">{{ totalItems }}</span> รายการ
        </span>

        <div class="flex items-center gap-2">
           <span>แสดง:</span>
           <select v-model="itemsPerPage" class="bg-white border border-gray-300 text-gray-700 text-xs rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-1.5 cursor-pointer outline-none shadow-sm">
             <option :value="5">5</option>
             <option :value="10">10</option>
             <option :value="20">20</option>
             <option :value="50">50</option>
             <option :value="100">100</option>
           </select>
        </div>
      </div>

      <div class="flex items-center gap-1">
        <button
          @click="changePage(currentPage - 1)"
          :disabled="currentPage === 1"
          class="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>

        <div class="flex gap-1">
           <template v-for="(p, index) in visiblePages" :key="index">
              <span v-if="p === '...'" class="px-2 py-1 text-gray-400">...</span>
              <button
                v-else
                @click="changePage(p)"
                class="px-3 py-1 rounded-lg text-xs font-medium transition-all shadow-sm"
                :class="currentPage === p ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 hover:bg-gray-50 text-gray-700'"
              >
                {{ p }}
              </button>
           </template>
        </div>

        <button
          @click="changePage(currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>

    </div>

  </div>
</template>

<style scoped>
/* Scrollbar สวยๆ */
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #f8fafc;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
  border: 2px solid #f8fafc;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
