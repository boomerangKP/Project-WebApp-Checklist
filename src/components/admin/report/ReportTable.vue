<script setup>
import { ref, computed, watch } from 'vue'
// ✅ เพิ่มไอคอน Check, Copy เข้ามา
import { Loader2, Search, Eye, ChevronLeft, ChevronRight, Clock, Hash, Check, Copy } from 'lucide-vue-next'

const props = defineProps(['logs', 'loading'])
const emit = defineEmits(['update:search', 'view'])

// --- Pagination State ---
const currentPage = ref(1)
const itemsPerPage = ref(10)
const copiedId = ref(null) // ✅ ตัวแปรเก็บสถานะว่า ID ไหนเพิ่งถูก copy

watch(() => props.logs, () => {
  currentPage.value = 1
})

// --- Computed Logic ---
const totalPages = computed(() => Math.ceil((props.logs?.length || 0) / itemsPerPage.value) || 1)

const paginatedLogs = computed(() => {
  if (!props.logs) return []
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return props.logs.slice(start, end)
})

const startEntry = computed(() => props.logs?.length === 0 ? 0 : (currentPage.value - 1) * itemsPerPage.value + 1)
const endEntry = computed(() => Math.min(currentPage.value * itemsPerPage.value, props.logs?.length || 0))

// --- Helpers ---
const changePage = (page) => {
  if (page >= 1 && page <= totalPages.value) currentPage.value = page
}

const formatThaiDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', calendar: 'buddhist' })
}

const getStatusColor = (status) => {
  switch (status) {
    case 'pass': case 'approved': case 'fixed': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    case 'fail': case 'rejected': return 'bg-rose-100 text-rose-700 border-rose-200'
    default: return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

const getStatusLabel = (status) => {
  const map = { pass: 'เรียบร้อย', approved: 'อนุมัติแล้ว', fixed: 'แก้ไขแล้ว', fail: 'พบปัญหา', rejected: 'ปฏิเสธ', waiting: 'รอตรวจ' }
  return map[status] || status
}

// ✅ ฟังก์ชัน Copy Job ID
const copyJobId = async (id) => {
  const textToCopy = `#${id.toString().padStart(6, '0')}` // จัดรูปแบบก่อน copy
  try {
    await navigator.clipboard.writeText(textToCopy)
    copiedId.value = id
    // คืนค่าเดิมหลังจาก 2 วินาที
    setTimeout(() => {
      copiedId.value = null
    }, 2000)
  } catch (err) {
    console.error('Failed to copy', err)
  }
}
</script>

<template>
  <div class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-380px)] relative">

    <div class="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-white z-5">
      <h2 class="font-bold text-gray-800 text-lg">รายการตรวจสอบ</h2>
      <div class="relative w-full sm:w-64">
        <input 
          @input="$emit('update:search', $event.target.value)" 
          type="text" 
          placeholder="ค้นหาชื่อ, สถานที่..." 
          class="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all" 
        />
        <Search class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
      </div>
    </div>

    <div class="flex-1 overflow-y-auto overflow-x-auto relative custom-scrollbar">
      <table class="w-full text-left border-collapse">
        
        <thead class="sticky top-0 z-5 bg-gray-50/95 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider backdrop-blur-sm shadow-sm">
          <tr>
            <th class="px-6 py-4 font-medium whitespace-nowrap w-[150px]">รหัสงาน</th> 
            <th class="px-6 py-4 font-medium whitespace-nowrap">วันที่ตรวจ</th>
            <th class="px-6 py-4 font-medium whitespace-nowrap">พนักงาน</th>
            <th class="px-6 py-4 font-medium whitespace-nowrap">สถานที่</th>
            <th class="px-6 py-4 font-medium text-center whitespace-nowrap">สถานะ</th>
            <th class="px-6 py-4 font-medium text-right whitespace-nowrap">จัดการ</th>
          </tr>
        </thead>
        
        <tbody class="divide-y divide-gray-100 bg-white">
          <tr v-if="loading">
            <td colspan="6" class="px-6 py-20 text-center text-gray-400">
              <div class="flex flex-col items-center justify-center">
                <Loader2 class="w-8 h-8 animate-spin text-indigo-500 mb-2" /> 
                <span>กำลังโหลดข้อมูล...</span>
              </div>
            </td>
          </tr>
          
          <tr v-else-if="paginatedLogs.length === 0">
            <td colspan="6" class="px-6 py-20 text-center text-gray-400">
              <div class="border-2 border-dashed border-gray-200 rounded-xl p-8 mx-auto max-w-sm">
                ไม่พบข้อมูล
              </div>
            </td>
          </tr>
          
          <tr v-else v-for="log in paginatedLogs" :key="log.check_sessions_id" class="hover:bg-gray-50/80 transition-colors group">
            
            <td class="px-6 py-4">
              <button 
                @click.stop="copyJobId(log.check_sessions_id)"
                class="group/btn flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all duration-200 font-mono text-xs font-bold w-full max-w-[120px]"
                :class="copiedId === log.check_sessions_id 
                  ? 'bg-emerald-100 border-emerald-200 text-emerald-700' 
                  : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 shadow-sm'"
                title="คลิกเพื่อคัดลอกรหัสงาน"
              >
                <Check v-if="copiedId === log.check_sessions_id" class="w-3.5 h-3.5" />
                <Hash v-else class="w-3.5 h-3.5 text-gray-400 group-hover/btn:text-indigo-500" />
                
                <span>#{{ log.check_sessions_id.toString().padStart(6, '0') }}</span>
                
                <Copy v-if="copiedId !== log.check_sessions_id" class="w-3 h-3 ml-auto opacity-0 group-hover/btn:opacity-50" />
              </button>
            </td>

            <td class="px-6 py-4">
               <div class="flex items-center gap-2 text-sm text-gray-600">
                 <Clock class="w-4 h-4 text-gray-400" />
                 {{ formatThaiDate(log.created_at) }}
               </div>
            </td>

            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <img :src="log.employees?.employees_photo || 'https://via.placeholder.com/40'" class="w-9 h-9 rounded-full object-cover border border-gray-200" />
                <div><div class="text-sm font-medium text-gray-900">{{ log.employees?.employees_firstname }} {{ log.employees?.employees_lastname }}</div></div>
              </div>
            </td>
            <td class="px-6 py-4">
              <div class="text-sm text-gray-900 font-medium">{{ log.locations?.locations_name }}</div>
              <div class="text-xs text-gray-500"> อาคาร {{ log.locations?.locations_building }} • ชั้น {{ log.locations?.locations_floor }}</div>
            </td>
            <td class="px-6 py-4 text-center">
              <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border" :class="getStatusColor(log.check_sessions_status)">
                <span class="w-1.5 h-1.5 rounded-full mr-1.5" :class="log.check_sessions_status === 'fail' ? 'bg-rose-500' : 'bg-emerald-500'"></span>
                {{ getStatusLabel(log.check_sessions_status) }}
              </span>
            </td>
            <td class="px-6 py-4 text-right">
              <button @click="$emit('view', log.check_sessions_id)" class="text-gray-400 hover:text-indigo-600 p-2 rounded-full hover:bg-indigo-50 transition-all"><Eye class="w-4 h-4" /></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="!loading && logs.length > 0" class="sticky bottom-0 z-20 bg-white px-6 py-4 border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex flex-col sm:flex-row gap-4 items-center justify-between">
      <div class="flex items-center gap-4 text-sm text-gray-600">
        <span>แสดง {{ startEntry }} ถึง {{ endEntry }} จาก {{ logs.length }} รายการ</span>
        <div class="flex items-center gap-2">
          <span>แสดง:</span>
          <select v-model="itemsPerPage" class="border border-gray-300 rounded-md text-sm py-1 px-2 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer bg-white">
            <option :value="5">5</option>
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="30">30</option>
            <option :value="50">50</option>
          </select>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button @click="changePage(currentPage - 1)" :disabled="currentPage === 1" class="p-2 rounded-lg border border-gray-200 hover:bg-white hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 bg-white transition-all">
          <ChevronLeft class="w-4 h-4" />
        </button>
        <div class="flex items-center gap-1">
          <button v-for="page in totalPages" :key="page" @click="changePage(page)" class="w-8 h-8 rounded-lg text-sm font-medium transition-colors" :class="currentPage === page ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-gray-600 hover:bg-white hover:shadow-sm'" v-show="Math.abs(page - currentPage) <= 1 || page === 1 || page === totalPages">
            <span v-if="Math.abs(page - currentPage) > 1 && page !== 1 && page !== totalPages">...</span>
            <span v-else>{{ page }}</span>
          </button>
        </div>
        <button @click="changePage(currentPage + 1)" :disabled="currentPage === totalPages" class="p-2 rounded-lg border border-gray-200 hover:bg-white hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 bg-white transition-all">
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>
    </div>

  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
.custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; border: 2px solid #f8fafc; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
</style>