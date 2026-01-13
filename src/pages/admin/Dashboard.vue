<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue' // ✅ เพิ่ม computed, watch
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { 
  Loader2, 
  Building, 
  BarChart3, 
  RefreshCw,
  TrendingUp,
  Filter // ✅ เพิ่มไอคอน Filter
} from 'lucide-vue-next'

// Components
import StatsCards from '@/components/admin/dashboard/StatsCards.vue'
import TaskTrendsChart from '@/components/admin/dashboard/TaskTrendsChart.vue'
import RecentActivityList from '@/components/admin/dashboard/RecentActivityList.vue'

const router = useRouter()

// --- State ---
const loading = ref(true)
const isRefreshing = ref(false)
const realtimeChannel = ref(null)

// ✅ [NEW] ตัวแปรสำหรับ Filter
const selectedBuilding = ref('ทั้งหมด')
const uniqueBuildings = ref([]) // เก็บรายชื่อตึกที่มีทั้งหมด (A, B, C...)

// ข้อมูลดิบ (Raw Data) เก็บไว้ก่อนถูก Filter
const rawSessions = ref([])
const rawLocations = ref([])
const rawFeedbacks = ref([])

// ข้อมูลที่จะนำไปแสดงผล (Reactive)
const stats = ref({ 
  total: 0, pending: 0, completed: 0, activeStaff: 0, todayReviews: 0, averageRating: 0
})
const recentActivities = ref([])
const chartData = ref({ labels: [], datasets: [] })

// --- Chart Configuration (คงเดิม) ---
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { 
    legend: { 
      display: true, 
      position: 'top',
      labels: { usePointStyle: true, boxWidth: 8, font: { family: "'Noto Sans Thai', sans-serif" } }
    } 
  },
  layout: { padding: { bottom: 20, left: 10, right: 10, top: 10 } },
  scales: {
    y: { 
      beginAtZero: true, 
      grid: { color: '#f3f4f6' },
      ticks: { precision: 0, font: { family: "'Noto Sans Thai', sans-serif" } } 
    },
    x: { 
      grid: { display: false },
      ticks: { font: { family: "'Noto Sans Thai', sans-serif" } }
    }
  }
}

// --- Helpers ---
const getTodayDate = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getProgressColor = (percent) => {
  if (percent === 100) return 'bg-emerald-500'
  if (percent >= 50) return 'bg-blue-500'
  return 'bg-amber-500'
}

const goToDetail = (item) => {
  if (item && item.check_sessions_id) {
    router.push(`/admin/check/${item.check_sessions_id}`)
  }
}

// --- ✅ [LOGIC ใหม่] คำนวณข้อมูลตาม Filter ---
const calculateDashboardData = () => {
  // 1. Filter ข้อมูลตามตึกที่เลือก
  let filteredLocations = rawLocations.value
  let filteredSessions = rawSessions.value

  if (selectedBuilding.value !== 'ทั้งหมด') {
    filteredLocations = rawLocations.value.filter(l => l.locations_building === selectedBuilding.value)
    filteredSessions = rawSessions.value.filter(s => s.locations.locations_building === selectedBuilding.value)
  }

  // 2. คำนวณ Stats Cards
  // *เป้าหมายต่อรอบ = จำนวนห้องที่ผ่านการกรอง*
  const targetPerShift = filteredLocations.length 
  
  // แยกงาน เช้า/บ่าย
  const morningSessions = filteredSessions.filter(s => new Date(s.created_at).getHours() < 12)
  const afternoonSessions = filteredSessions.filter(s => new Date(s.created_at).getHours() >= 12)

  const calculateShiftStats = (shiftSessions, targetCount) => {
    const completedIds = new Set(
      shiftSessions
        .filter(s => ['pass', 'fixed', 'approved'].includes(s.check_sessions_status))
        .map(s => s.locations_id)
    )
    const completed = completedIds.size
    const problem = shiftSessions.filter(s => ['fail', 'rejected'].includes(s.check_sessions_status)).length
    const pending = Math.max(0, targetCount - completed)
    return { completed, problem, pending }
  }

  const morningStats = calculateShiftStats(morningSessions, targetPerShift)
  const afternoonStats = calculateShiftStats(afternoonSessions, targetPerShift)

  const totalDailyTarget = targetPerShift // * 2 ถ้าอยากนับรวม 2 รอบ
  const totalCompleted = morningStats.completed + afternoonStats.completed
  const totalPending = Math.max(0, totalDailyTarget - totalCompleted)
  const uniqueStaff = new Set(filteredSessions.map(s => s.employees_id)).size

  // คำนวณรีวิว (รีวิวเป็นภาพรวม ไม่กรองตามตึก เพราะ feedback อาจไม่ได้ผูก location เสมอไป)
  let reviewsCount = 0
  let avgRating = 0
  if (rawFeedbacks.value.length > 0) {
    reviewsCount = rawFeedbacks.value.length
    const sumRating = rawFeedbacks.value.reduce((acc, curr) => acc + curr.rating, 0)
    avgRating = (sumRating / reviewsCount).toFixed(1)
  }

  stats.value = { 
      total: totalDailyTarget, 
      pending: totalPending, 
      completed: totalCompleted, 
      activeStaff: uniqueStaff,
      todayReviews: reviewsCount,
      averageRating: avgRating
  }

  // 3. อัปเดต Chart
  chartData.value = {
    labels: ['รอตรวจสอบ', 'เรียบร้อย', 'พบปัญหา'],
    datasets: [
      {
        label: 'รอบเช้า',
        data: [morningStats.pending, morningStats.completed, morningStats.problem],
        backgroundColor: '#3b82f6',
        borderRadius: 4,
        barPercentage: 0.6, categoryPercentage: 0.8
      },
      {
        label: 'รอบบ่าย',
        data: [afternoonStats.pending, afternoonStats.completed, afternoonStats.problem],
        backgroundColor: '#f59e0b',
        borderRadius: 4,
        barPercentage: 0.6, categoryPercentage: 0.8
      }
    ]
  }

  // 4. อัปเดต Recent Activity (กรองตามตึกด้วย)
  recentActivities.value = filteredSessions.slice(0, 50)
}

// --- ✅ [LOGIC ใหม่] Computed สำหรับ Progress Bar ด้านขวา (อัจฉริยะ) ---
const progressStats = computed(() => {
  const map = {}
  
  if (selectedBuilding.value === 'ทั้งหมด') {
    // --- โหมดภาพรวม: รวมยอดเป็น "รายตึก" (Building A, Building B...) ---
    rawLocations.value.forEach(loc => {
      const key = loc.locations_building
      if (!map[key]) map[key] = { name: `อาคาร ${key}`, target: 0, done: 0, id: key }
      map[key].target += 1 // นับจำนวนห้องในตึกนี้
    })

    // นับงานที่เสร็จในแต่ละตึก
    rawSessions.value.forEach(s => {
      if (['pass', 'fixed', 'approved'].includes(s.check_sessions_status)) {
        const key = s.locations.locations_building
        if (map[key]) map[key].done += 1
      }
    })

  } else {
    // --- โหมดเจาะจง: รวมยอดเป็น "รายชั้น" (เฉพาะตึกที่เลือก) ---
    
    // 1. กรอง Location เฉพาะตึกที่เลือก
    const targetLocations = rawLocations.value.filter(l => l.locations_building === selectedBuilding.value)
    
    targetLocations.forEach(loc => {
      const key = `${loc.locations_floor}`
      if (!map[key]) map[key] = { name: `ชั้น ${loc.locations_floor}`, target: 0, done: 0, floor: parseInt(loc.locations_floor) }
      map[key].target += 1
    })

    // 2. กรอง Session เฉพาะตึกที่เลือก
    const targetSessions = rawSessions.value.filter(s => s.locations.locations_building === selectedBuilding.value)
    
    targetSessions.forEach(s => {
      if (['pass', 'fixed', 'approved'].includes(s.check_sessions_status)) {
        const key = `${s.locations.locations_floor}`
        if (map[key]) map[key].done += 1
      }
    })
  }

  // แปลง Object เป็น Array แล้ว Sort
  return Object.values(map)
    .sort((a, b) => {
       // ถ้าเป็นชั้น ให้เรียงตามเลขชั้น
       if (a.floor !== undefined) return a.floor - b.floor
       // ถ้าเป็นตึก ให้เรียงตามชื่อ
       return a.name.localeCompare(b.name)
    })
    .map(item => ({
      name: item.name,
      total: item.target, // งานทั้งหมดต่อรอบ (เช่น ห้องทั้งหมดในตึก/ชั้นนั้น)
      completed: Math.min(item.done, item.target * 2) // * 2 เผื่อเคสทำ 2 รอบ แต่แสดงผลแค่ให้เห็น progress พอสังเขป
    }))
})


// --- Main Fetch Logic ---
const fetchData = async () => {
  try {
    const today = getTodayDate()
    
    // 1. Fetch Locations (ดึงทั้งหมดมาก่อน แล้วค่อย Filter ใน JS)
    const { data: allLocations, error: locError } = await supabase
      .from('locations')
      .select('locations_id, locations_building, locations_floor')
      .eq('locations_status', 'active')
    if (locError) throw locError
    
    rawLocations.value = allLocations
    
    // ✅ ดึงรายชื่อตึกทั้งหมดออกมา (Unique) เพื่อใส่ใน Dropdown
    const buildings = [...new Set(allLocations.map(l => l.locations_building))].sort()
    uniqueBuildings.value = buildings

    // 2. Fetch Sessions
    const { data: sessions, error } = await supabase
      .from('check_sessions')
      .select(`*, locations(locations_id, locations_building, locations_floor, locations_name), employees(*)`)
      .eq('check_sessions_date', today)
      .order('updated_at', { ascending: false })
    if (error) throw error
    
    rawSessions.value = sessions

    // 3. Fetch Reviews
    const { data: feedbacks, error: feedbackError } = await supabase
      .from('feedbacks')
      .select('rating')
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`)
    if (feedbackError) throw feedbackError
    
    rawFeedbacks.value = feedbacks

    // ✅ คำนวณค่าต่างๆ ครั้งแรก
    calculateDashboardData()

  } catch (err) {
    console.error('Error fetching dashboard:', err)
  } finally {
    loading.value = false
    isRefreshing.value = false
  }
}

// ✅ Watcher: เมื่อเลือกตึกใหม่ ให้คำนวณกราฟและ Stats ใหม่ทันที
watch(selectedBuilding, () => {
  calculateDashboardData()
})

const handleRefresh = async () => {
    isRefreshing.value = true
    await fetchData()
}

const subscribeRealtime = () => {
  if (realtimeChannel.value) supabase.removeChannel(realtimeChannel.value)
  realtimeChannel.value = supabase
    .channel('dashboard-main-stats')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'check_sessions' }, () => fetchData())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'feedbacks' }, () => fetchData())
    .subscribe()
}

onMounted(() => {
  fetchData()
  subscribeRealtime()
})

onUnmounted(() => {
  if (realtimeChannel.value) supabase.removeChannel(realtimeChannel.value)
})
</script>

<template>
  <div class="space-y-6 pb-10">
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
        <p class="text-gray-500 mt-1 flex items-center gap-2">
          ภาพรวมการทำงานประจำวันที่ 
          <span class="font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
            {{ new Date().toLocaleDateString('th-TH', { dateStyle: 'long' }) }}
          </span>
        </p>
      </div>

      <div class="flex items-center gap-3">
        <div class="relative group">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter class="h-4 w-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
            </div>
            <select 
                v-model="selectedBuilding"
                class="pl-9 pr-8 py-2 bg-white border border-gray-200 text-gray-700 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm hover:border-gray-300 transition-all cursor-pointer appearance-none min-w-[140px]"
            >
                <option value="ทั้งหมด">อาคารทั้งหมด</option>
                <option v-for="b in uniqueBuildings" :key="b" :value="b">อาคาร {{ b }}</option>
            </select>
            <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
            </div>
        </div>

        <button 
          @click="handleRefresh" 
          :disabled="isRefreshing"
          class="text-sm text-gray-600 hover:text-indigo-600 transition-colors flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 hover:border-indigo-200 hover:bg-indigo-50 hover:shadow-sm active:scale-95 disabled:opacity-70"
        >
           <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isRefreshing }" />
           <span class="hidden sm:inline">{{ isRefreshing ? 'กำลังอัปเดต...' : 'อัปเดต' }}</span>
        </button>
      </div>
    </div>

    <div v-if="loading" class="h-96 flex flex-col items-center justify-center bg-white rounded-3xl shadow-sm border border-gray-100">
      <Loader2 class="w-10 h-10 animate-spin text-indigo-600 mb-3" />
      <span class="text-gray-400 text-sm font-medium">กำลังประมวลผลข้อมูล...</span>
    </div>

    <div v-else class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <StatsCards :stats="stats" />

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div class="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 h-[480px] flex flex-col relative overflow-hidden">
            <h3 class="font-bold text-gray-800 mb-6 flex items-center gap-2 text-lg">
                <div class="p-1.5 bg-indigo-50 rounded-lg">
                  <BarChart3 class="w-5 h-5 text-indigo-500" /> 
                </div>
                เปรียบเทียบผลงาน รอบเช้า vs บ่าย
            </h3>
            <div class="flex-1 w-full min-h-0 relative">
                 <TaskTrendsChart :chart-data="chartData" :chart-options="chartOptions" />
            </div>
        </div>

        <div class="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col h-[480px] relative overflow-hidden">
            <h3 class="font-bold text-gray-800 mb-4 flex items-center justify-between gap-2 text-lg">
                <div class="flex items-center gap-2">
                    <div class="p-1.5 bg-indigo-50 rounded-lg">
                       <Building class="w-5 h-5 text-indigo-500" /> 
                    </div>
                    <span>{{ selectedBuilding === 'ทั้งหมด' ? 'ภาพรวมรายอาคาร' : `ความคืบหน้า อาคาร ${selectedBuilding}` }}</span>
                </div>
            </h3>
            
            <div class="flex-1 overflow-y-auto pr-2 space-y-5 custom-scrollbar">
                <div v-for="item in progressStats" :key="item.name" class="space-y-2 group">
                    <div class="flex justify-between text-sm items-end">
                        <span class="font-semibold text-gray-700 group-hover:text-indigo-600 transition-colors">
                            {{ item.name }}
                        </span>
                        <div class="text-right flex items-baseline gap-1">
                           <span class="font-bold text-lg" :class="item.completed >= item.total ? 'text-emerald-600' : 'text-gray-800'">
                             {{ item.completed }}
                           </span>
                           <span class="text-gray-400 text-xs font-medium">งาน</span>
                        </div>
                    </div>
                    
                    <div class="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden relative shadow-inner">
                        <div 
                            class="h-full rounded-full transition-all duration-1000 ease-out relative"
                            :class="getProgressColor((item.completed / (item.total * 2)) * 100)" 
                            :style="{ width: `${Math.min((item.completed / (item.total * 1)) * 100, 100)}%` }"
                        >
                             <div class="absolute top-0 left-0 bottom-0 right-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full -translate-x-full animate-shimmer"></div>
                        </div>
                    </div>
                </div>

                <div v-if="progressStats.length === 0" class="flex flex-col items-center justify-center h-full text-gray-400 text-sm opacity-60">
                   <Building class="w-12 h-12 mb-2 stroke-1" />
                   ไม่พบข้อมูล
                </div>
            </div>
            
            <div class="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
        </div>
      </div>

      <div class="bg-white h-[500px] rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
         <div class="p-6 border-b border-gray-100 flex items-center justify-between gap-2 shrink-0">
            <div class="flex items-center gap-2">
                <div class="p-1.5 bg-indigo-50 rounded-lg">
                  <TrendingUp class="w-5 h-5 text-indigo-500" />
                </div>
                <h3 class="font-bold text-gray-800 text-lg">กิจกรรมล่าสุด</h3>
            </div>
         </div>
         
         <div class="flex-1 min-h-0 p-1">
             <RecentActivityList :activities="recentActivities" @click="goToDetail" />
         </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* Scrollbar */
.custom-scrollbar::-webkit-scrollbar { width: 5px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }

/* Shimmer Animation */
@keyframes shimmer { 100% { transform: translateX(100%); } }
.animate-shimmer { animation: shimmer 2s infinite linear; }
</style>