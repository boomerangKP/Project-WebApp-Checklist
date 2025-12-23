<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-vue-next'

// Components
import TaskFilter from '@/components/admin/task/TaskFilter.vue'
import TaskCard from '@/components/admin/task/TaskCard.vue'
import BulkActionBar from '@/components/admin/task/BulkActionBar.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'

const router = useRouter()

// --- State ---
const tasks = ref([])
const loading = ref(true)
const activeTab = ref('waiting')
const searchQuery = ref('')
const selectedMaid = ref('all')

// Pagination State
const currentPage = ref(1)
const itemsPerPage = ref(10)

const isSelectionMode = ref(false)
const selectedIds = ref([])
const isBulkSubmitting = ref(false)

const modalConfig = ref({ isOpen: false, type: '', title: '', message: '', variant: 'success' })

// ตัวแปรเก็บ Subscription สำหรับ Realtime
let realtimeSubscription = null

// 🔥 เพิ่มตัวแปรเก็บข้อมูลรอบเวลา (Time Slots)
const timeSlots = ref([])

// --- Helper Functions ---

// 1. ฟังก์ชันไปดึงข้อมูลรอบเวลาจาก Database
const fetchTimeSlots = async () => {
  const { data } = await supabase.from('time_slots').select('*').order('time_slots_order')
  if (data) timeSlots.value = data
}

// 2. ฟังก์ชันคำนวณ: เอาเวลาที่ส่ง มาเทียบหาชื่อรอบ (เช่น "08.00 - 09.00 น.")
const getSlotName = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  // ดึงเวลาออกมาเป็น HH:mm:ss เพื่อเอาไปเทียบ
  const timeStr = date.toLocaleTimeString('en-GB', { hour12: false }) 
  
  // หาว่าเวลานี้ ตกอยู่ในช่องไหน
  const match = timeSlots.value.find(slot => 
    timeStr >= slot.time_slots_start && timeStr < slot.time_slots_end
  )
  
  return match ? match.time_slots_name : 'นอกเวลาทำการ'
}

// --- Logic Data & Filter ---
const fetchTasks = async () => {
  // ถ้าโหลดครั้งแรกให้หมุนติ้วๆ
  if (tasks.value.length === 0) loading.value = true

  try {
    // 🔥 โหลดตารางเวลาให้เสร็จก่อน (ถ้ายังไม่มี)
    if (timeSlots.value.length === 0) await fetchTimeSlots()

    const { data, error } = await supabase.from('check_sessions').select(`
        check_sessions_id, check_sessions_date, check_sessions_time_start, check_sessions_status, created_at,
        employees ( employees_firstname, employees_lastname, employees_photo, role ),
        locations ( locations_name, locations_building, locations_floor )
      `).order('created_at', { ascending: false })

    if (error) throw error

    // Transform Data
    tasks.value = data.map(item => {
      // Map สถานะ
      let mappedStatus = 'waiting'
      const s = item.check_sessions_status

      if (['approved', 'pass'].includes(s)) {
        mappedStatus = 'approved'
      } else if (['rejected', 'fail'].includes(s)) {
        mappedStatus = 'rejected'
      } else {
        mappedStatus = 'waiting'
      }

      return {
        id: item.check_sessions_id,
        maidName: item.employees ? `${item.employees.employees_firstname} ${item.employees.employees_lastname}` : 'ไม่ระบุชื่อ',
        maidRole: item.employees?.role === 'maid' ? 'พนักงานทำความสะอาด' : 'พนักงาน',
        maidPhoto: item.employees?.employees_photo,
        location: item.locations?.locations_name || 'ไม่ระบุสถานที่',
        floor: item.locations ? `${item.locations.locations_building} ชั้น ${item.locations.locations_floor}` : '-',
        date: new Date(item.check_sessions_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }),
        
        // 🔥 แก้ตรงนี้: ใช้ฟังก์ชัน getSlotName แทนการตัด string เดิม
        time: getSlotName(item.created_at), 
        
        status: mappedStatus,
        originalStatus: s 
      }
    })
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

// 🔥 ฟังก์ชัน Realtime: งานเข้าปุ๊บ ดึงใหม่ปั๊บ
const subscribeRealtime = () => {
  realtimeSubscription = supabase
    .channel('table-db-changes')
    .on(
      'postgres_changes',
      {
        event: '*', 
        schema: 'public',
        table: 'check_sessions',
      },
      (payload) => {
        fetchTasks()
      }
    )
    .subscribe()
}

const uniqueMaids = computed(() => [...new Set(tasks.value.map(t => t.maidName))])

// Filtered Result
const filteredTasks = computed(() => tasks.value.filter(t => {
  return (activeTab.value === 'all' || t.status === activeTab.value) &&
         (t.maidName.includes(searchQuery.value) || t.location.includes(searchQuery.value)) &&
         (selectedMaid.value === 'all' || t.maidName === selectedMaid.value)
}))

// --- Pagination Logic ---
const totalPages = computed(() => Math.ceil(filteredTasks.value.length / itemsPerPage.value) || 1)

const paginatedTasks = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredTasks.value.slice(start, end)
})

const startEntry = computed(() => filteredTasks.value.length === 0 ? 0 : (currentPage.value - 1) * itemsPerPage.value + 1)
const endEntry = computed(() => Math.min(currentPage.value * itemsPerPage.value, filteredTasks.value.length))

const changePage = (page) => {
  if (page >= 1 && page <= totalPages.value) currentPage.value = page
}

// --- Logic Selection ---
const toggleSelection = (id) => {
  if (activeTab.value !== 'waiting') return
  if (selectedIds.value.includes(id)) selectedIds.value = selectedIds.value.filter(i => i !== id)
  else selectedIds.value.push(id)
}

const toggleSelectAll = () => {
  const visibleIds = paginatedTasks.value.map(t => t.id)
  if (visibleIds.length === 0) return

  const allSelectedInPage = visibleIds.every(id => selectedIds.value.includes(id))

  if (allSelectedInPage) {
    selectedIds.value = selectedIds.value.filter(id => !visibleIds.includes(id))
  } else {
    const newIds = visibleIds.filter(id => !selectedIds.value.includes(id))
    selectedIds.value = [...selectedIds.value, ...newIds]
  }
}

const isAllSelected = computed(() => paginatedTasks.value.length > 0 && paginatedTasks.value.every(t => selectedIds.value.includes(t.id)))
const waitingCount = computed(() => tasks.value.filter(t => t.status === 'waiting').length)

// --- Logic Action ---
const openTaskDetail = (id) => router.push({ path: `/admin/check/${id}` }) 

const openBulkApproveModal = () => {
  modalConfig.value = {
    isOpen: true, type: 'bulk_approve',
    title: `ยืนยันอนุมัติ ${selectedIds.value.length} รายการ?`,
    message: 'รายการที่เลือกทั้งหมดจะถูกเปลี่ยนสถานะเป็น "อนุมัติ"',
    variant: 'success'
  }
}

const processBulkApprove = async () => {
  isBulkSubmitting.value = true
  try {
    const { error } = await supabase.from('check_sessions')
      .update({ check_sessions_status: 'approved', updated_at: new Date() })
      .in('check_sessions_id', selectedIds.value)
    if (error) throw error

    await fetchTasks()

    selectedIds.value = []
    isSelectionMode.value = false
  } catch (err) { alert(err.message) } finally { isBulkSubmitting.value = false }
}

// Watchers
watch([activeTab, itemsPerPage, searchQuery, selectedMaid], () => {
  currentPage.value = 1
  selectedIds.value = []
  isSelectionMode.value = false
})

onMounted(() => {
  fetchTimeSlots() // เรียกโหลดตารางเวลา
  fetchTasks()     // เรียกโหลดงาน
  subscribeRealtime() 
})

onUnmounted(() => {
  if (realtimeSubscription) supabase.removeChannel(realtimeSubscription)
})
</script>

<template>
  <div class="space-y-6 pb-24">

    <h1 class="text-2xl font-bold text-gray-800">รายการตรวจสอบงาน</h1>

    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px] flex flex-col">

      <div class="p-4 border-b border-gray-100">
        <TaskFilter
          v-model:activeTab="activeTab"
          v-model:searchQuery="searchQuery"
          v-model:selectedMaid="selectedMaid"
          :maids="uniqueMaids"
          :isSelectionMode="isSelectionMode"
          :isAllSelected="isAllSelected"
          :waitingCount="waitingCount"
          @toggleSelectionMode="isSelectionMode = !isSelectionMode"
          @toggleSelectAll="toggleSelectAll"
          @refresh="fetchTasks"
        />
      </div>

      <div class="flex-1 p-4 bg-gray-50/50">

        <div v-if="loading" class="flex justify-center py-20">
          <Loader2 class="w-10 h-10 text-gray-400 animate-spin" />
        </div>

        <div v-else class="space-y-3">
          <TaskCard
            v-for="task in paginatedTasks"
            :key="task.id"
            :task="task"
            :isSelectionMode="isSelectionMode"
            :isSelected="selectedIds.includes(task.id)"
            @click="openTaskDetail(task.id)"
            @toggleSelect="toggleSelection"
          />

          <div v-if="paginatedTasks.length === 0" class="text-center py-16 bg-white rounded-lg border border-dashed border-gray-300">
            <p class="text-gray-400">ไม่พบรายการงาน ({{ activeTab }})</p>
          </div>
        </div>

      </div>

      <div class="px-6 py-4 border-t border-gray-100 bg-white flex flex-col sm:flex-row gap-4 items-center justify-between">

        <div class="flex items-center gap-4 text-sm text-gray-600">
          <span>แสดง {{ startEntry }} ถึง {{ endEntry }} จาก {{ filteredTasks.length }} รายการ</span>

          <div class="flex items-center gap-2">
            <span>แสดง:</span>
            <select
              v-model="itemsPerPage"
              class="border border-gray-300 rounded-md text-sm py-1 px-2 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
            >
              <option :value="5">5</option>
              <option :value="10">10</option>
              <option :value="20">20</option>
              <option :value="30">30</option>
              <option :value="50">50</option>
            </select>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="changePage(currentPage - 1)"
            :disabled="currentPage === 1"
            class="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>

          <div class="flex items-center gap-1">
            <button
              v-for="page in totalPages"
              :key="page"
              @click="changePage(page)"
              class="w-8 h-8 rounded-lg text-sm font-medium transition-colors"
              :class="currentPage === page ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'"
              v-show="Math.abs(page - currentPage) <= 1 || page === 1 || page === totalPages"
            >
              <span v-if="Math.abs(page - currentPage) > 1 && page !== 1 && page !== totalPages">...</span>
              <span v-else>{{ page }}</span>
            </button>
          </div>

          <button
            @click="changePage(currentPage + 1)"
            :disabled="currentPage === totalPages"
            class="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600"
          >
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>

    <BulkActionBar
      :count="selectedIds.length"
      :loading="isBulkSubmitting"
      @confirm="openBulkApproveModal"
      @cancel="selectedIds = []"
    />

    <ConfirmModal
      :is-open="modalConfig.isOpen"
      :title="modalConfig.title"
      :message="modalConfig.message"
      :variant="modalConfig.variant"
      :loading="isBulkSubmitting"
      confirm-text="ยืนยันอนุมัติ"
      @close="modalConfig.isOpen = false"
      @confirm="modalConfig.type === 'bulk_approve' ? processBulkApprove() : null; modalConfig.isOpen = false"
    />

  </div>
</template>