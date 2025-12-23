<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useUserStore } from '@/stores/user'
import { 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Loader2,
  CalendarDays
} from 'lucide-vue-next'

const userStore = useUserStore()
const loading = ref(true)
const historyItems = ref([])

// --- Helper: แปลงวันที่เป็น "วันนี้", "เมื่อวาน" ---
const formatThaiDate = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)

  const isToday = date.toDateString() === now.toDateString()
  const isYesterday = date.toDateString() === yesterday.toDateString()

  const timeStr = date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.'

  if (isToday) return `วันนี้ ${timeStr}`
  if (isYesterday) return `เมื่อวาน ${timeStr}`
  
  // ถ้าเก่ากว่านั้น แสดงวันที่เต็ม
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) + ' ' + timeStr
}

// --- Fetch Data ---
const fetchHistory = async () => {
  try {
    loading.value = true
    const { data, error } = await supabase
      .from('check_sessions')
      .select(`
        *,
        locations (locations_name, locations_building, locations_floor),
        restroom_types (restroom_types_name)
      `)
      .eq('employees_id', userStore.profile.employees_id)
      .order('created_at', { ascending: false }) // ใหม่สุดขึ้นก่อน
      .limit(50) // ดึง 50 รายการล่าสุด

    if (error) throw error
    historyItems.value = data

  } catch (err) {
    console.error('Error fetching history:', err)
  } finally {
    loading.value = false
  }
}

// --- Status Helpers (เลือกสี/ข้อความ ตามรูป) ---
const getStatusConfig = (status) => {
  switch (status) {
    case 'pass': 
    case 'fixed': // แก้แล้ว ก็นับว่าผ่าน
      return { 
        barColor: 'bg-green-500', 
        badgeBg: 'bg-green-500', 
        text: 'ผ่านแล้ว', 
        icon: CheckCircle2 
      }
    case 'fail': 
      return { 
        barColor: 'bg-red-600', 
        badgeBg: 'bg-red-600', 
        text: 'ถูกส่งกลับ (ต้องแก้ไข)', 
        icon: AlertCircle // หรือใช้ icon เขียนแบบในรูป
      }
    default: // waiting, in_progress
      return { 
        barColor: 'bg-orange-500', 
        badgeBg: 'bg-orange-500', 
        text: 'ส่งแล้ว (รอตรวจ)', 
        icon: Clock 
      }
  }
}

onMounted(() => {
  fetchHistory()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-24">
    
    <div class="bg-white p-4 shadow-sm sticky top-0 z-10 flex items-center justify-between">
      <div class="flex items-center gap-2 text-gray-800">
        <Clock class="w-6 h-6" />
        <h1 class="text-xl font-bold">ประวัติการส่งงาน</h1>
      </div>
      <button class="text-gray-500 hover:text-gray-800">
        <Filter class="w-6 h-6" />
      </button>
    </div>

    <div class="p-4 space-y-4">
      
      <div v-if="loading" class="flex flex-col items-center justify-center py-10 text-gray-400">
        <Loader2 class="w-8 h-8 animate-spin mb-2" />
        <p>กำลังโหลดข้อมูล...</p>
      </div>

      <div v-else-if="historyItems.length === 0" class="flex flex-col items-center justify-center py-20 text-gray-400">
        <CalendarDays class="w-16 h-16 mb-4 opacity-20" />
        <p>ยังไม่มีประวัติการส่งงาน</p>
      </div>

      <div 
        v-for="item in historyItems" 
        :key="item.check_sessions_id"
        class="bg-white rounded-xl shadow-sm overflow-hidden flex min-h-[100px] relative animate-in fade-in slide-in-from-bottom-2 duration-300"
      >
        <div 
          class="w-4 flex-shrink-0"
          :class="getStatusConfig(item.check_sessions_status).barColor"
        >
           <div class="w-1 h-4 bg-white/30 rounded-full mx-auto mt-8"></div>
        </div>

        <div class="flex-1 p-3 flex flex-col justify-center">
          
          <div class="flex justify-between items-start gap-2">
            <div>
              <h3 class="font-bold text-gray-800 text-sm md:text-base leading-tight">
                {{ item.locations?.locations_name }} 
              </h3>
              <p class="text-xs text-gray-500 mt-1">
                {{ item.locations?.locations_building }} ชั้น {{ item.locations?.locations_floor }} 
                ({{ item.restroom_types?.restroom_types_name }})
              </p>
              <p class="text-gray-600 font-medium text-sm mt-1">
                {{ formatThaiDate(item.created_at) }}
              </p>
            </div>

            <div 
              class="flex items-center gap-1 px-3 py-1.5 rounded-full text-white text-xs font-bold shadow-sm whitespace-nowrap"
              :class="getStatusConfig(item.check_sessions_status).badgeBg"
            >
              <component :is="getStatusConfig(item.check_sessions_status).icon" class="w-4 h-4" />
              <span>{{ getStatusConfig(item.check_sessions_status).text }}</span>
            </div>
          </div>

          <div v-if="item.check_sessions_status === 'fail'" class="mt-2 text-xs text-red-500 font-medium bg-red-50 p-2 rounded-lg border border-red-100">
            เหตุผล: {{ item.supervisor_comment || item.check_sessions_notes || 'มีความสกปรก / อุปกรณ์ชำรุด' }}
          </div>

        </div>
      </div>

    </div>
  </div>
</template>