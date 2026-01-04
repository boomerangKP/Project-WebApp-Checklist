<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { supabase } from '@/lib/supabase'
import { 
  Loader2, 
  Building, 
  BarChart3, 
  RefreshCw,
  TrendingUp 
} from 'lucide-vue-next'

// Components
import StatsCards from '@/components/admin/dashboard/StatsCards.vue'
import TaskTrendsChart from '@/components/admin/dashboard/TaskTrendsChart.vue'
import RecentActivityList from '@/components/admin/dashboard/RecentActivityList.vue'

// --- State ---
const loading = ref(true)
const isRefreshing = ref(false)
const realtimeChannel = ref(null)

const stats = ref({ total: 0, pending: 0, completed: 0, activeStaff: 0 })
const recentActivities = ref([])
const floorStats = ref([])

// --- Chart Configuration (ปรับใหม่เพื่อโชว์แท่งคู่) ---
const chartData = ref({
  labels: ['รอตรวจสอบ', 'เรียบร้อย', 'พบปัญหา'], // แกน X
  datasets: [] // เดี๋ยวเรายัดข้อมูลแยกเช้า/บ่ายใส่ตรงนี้
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { 
    legend: { 
      display: true, // ✅ เปิด Legend ให้รู้ว่าสีไหนรอบไหน
      position: 'top',
      labels: { usePointStyle: true, boxWidth: 8 }
    } 
  },
  layout: { padding: { bottom: 20, left: 10, right: 10, top: 10 } },
  scales: {
    y: { 
      beginAtZero: true, 
      grid: { color: '#f3f4f6' },
      ticks: { precision: 0 } 
    },
    x: { grid: { display: false } }
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

// --- Main Fetch Logic ---
const fetchData = async () => {
  try {
    const today = getTodayDate()
    
    // 1. ดึงเป้าหมายสถานที่ทั้งหมด
    const { data: allLocations, error: locError } = await supabase
      .from('locations')
      .select('locations_id, locations_building, locations_floor')
      .eq('locations_status', 'active')
    
    if (locError) throw locError

    // 2. ดึงงานที่ส่งมา "วันนี้"
    const { data: sessions, error } = await supabase
      .from('check_sessions')
      .select(`*, locations(locations_id, locations_building, locations_floor, locations_name), employees(*)`)
      .eq('check_sessions_date', today)
      .order('created_at', { ascending: false })

    if (error) throw error

    // --- 3. แยกข้อมูล รอบเช้า vs รอบบ่าย (Split Logic) ---
    // เช้า < 12:00, บ่าย >= 12:00
    const morningSessions = sessions.filter(s => new Date(s.created_at).getHours() < 12)
    const afternoonSessions = sessions.filter(s => new Date(s.created_at).getHours() >= 12)

    // Helper คำนวณยอดของแต่ละกะ
    const calculateShiftStats = (shiftSessions, targetCount) => {
      const completedIds = new Set(
        shiftSessions
          .filter(s => ['pass', 'fixed', 'approved'].includes(s.check_sessions_status))
          .map(s => s.locations_id)
      )
      const completed = completedIds.size
      const problem = shiftSessions.filter(s => ['fail', 'rejected'].includes(s.check_sessions_status)).length
      const pending = Math.max(0, targetCount - completed) // งานค้าง
      return { completed, problem, pending }
    }

    const targetPerShift = allLocations.length // เป้าต่อกะ คือจำนวนห้องทั้งหมด
    const morningStats = calculateShiftStats(morningSessions, targetPerShift)
    const afternoonStats = calculateShiftStats(afternoonSessions, targetPerShift)

    // --- 4. อัปเดต Chart (แท่งคู่) ---
    chartData.value = {
      labels: ['รอตรวจสอบ', 'เรียบร้อย', 'พบปัญหา'],
      datasets: [
        {
          label: 'รอบเช้า',
          data: [morningStats.pending, morningStats.completed, morningStats.problem],
          backgroundColor: '#3b82f6', // สีฟ้า
          borderRadius: 4,
          barPercentage: 0.6,
          categoryPercentage: 0.8
        },
        {
          label: 'รอบบ่าย',
          data: [afternoonStats.pending, afternoonStats.completed, afternoonStats.problem],
          backgroundColor: '#f59e0b', // สีส้ม
          borderRadius: 4,
          barPercentage: 0.6,
          categoryPercentage: 0.8
        }
      ]
    }

    // --- 5. Stats Cards (ยังโชว์ภาพรวมทั้งวันเหมือนเดิม เพื่อดูยอดรวม) ---
    // แต่เราคำนวณเป้ารวมเป็น x2 (เช้า+บ่าย) เพื่อให้ % ถูกต้อง
    const totalDailyTarget = targetPerShift
    
    // รวมงานเสร็จจริงทั้งวัน (เช้า + บ่าย)
    // หมายเหตุ: เราใช้วิธีบวกกันตรงๆ เพราะ 1 ห้องทำได้ 2 รอบ
    const totalCompleted = morningStats.completed + afternoonStats.completed
    const totalPending = Math.max(0, totalDailyTarget - totalCompleted)
    const uniqueStaff = new Set(sessions.map(s => s.employees_id)).size

    stats.value = { 
        total: totalDailyTarget, 
        pending: totalPending, 
        completed: totalCompleted, 
        activeStaff: uniqueStaff 
    }

    // --- 6. Floor Stats (ความคืบหน้าตามชั้น - เหมาวัน) ---
    // (ส่วนนี้ใช้ Logic เดิม เพื่อดูภาพรวมว่าชั้นไหนเสร็จครบ 2 รอบแล้วบ้าง)
    const floorsMap = {}
    allLocations.forEach(loc => {
        const key = `${loc.locations_building}|${loc.locations_floor}`
        if (!floorsMap[key]) {
            floorsMap[key] = { 
                name: `อาคาร ${loc.locations_building} ชั้น ${loc.locations_floor}`,
                building: loc.locations_building,
                floor: parseInt(loc.locations_floor) || 0,
                target: 0, 
                done: 0 
            }
        }
        // เป้าชั้นนี้ = จำนวนห้อง x 2 รอบ
        floorsMap[key].target += 1 
    })

    // วนลูปนับงานที่เสร็จ (ทั้งเช้าและบ่าย)
    sessions.forEach(s => {
       if (['pass', 'fixed', 'approved'].includes(s.check_sessions_status)) {
           const key = `${s.locations.locations_building}|${s.locations.locations_floor}`
           if (floorsMap[key]) {
               // นับเพิ่มทีละ 1 เลย (เพราะเราตั้งเป้า x2 ไว้แล้ว)
               floorsMap[key].done += 1
           }
       }
    })

    floorStats.value = Object.values(floorsMap)
        .sort((a, b) => {
            if (a.building !== b.building) return a.building.localeCompare(b.building)
            return a.floor - b.floor
        })
        .map(f => ({
            name: f.name,
            total: f.target,     // เป้าโชว์เป็นเลข x2
            completed: Math.min(f.done, f.target) // กันเกิน
        }))

    recentActivities.value = sessions.slice(0, 10)

  } catch (err) {
    console.error('Error fetching dashboard:', err)
  } finally {
    loading.value = false
    isRefreshing.value = false
  }
}

// ... (ส่วน handleRefresh และ Realtime เหมือนเดิม) ...
const handleRefresh = async () => {
    isRefreshing.value = true
    await fetchData()
}

const subscribeRealtime = () => {
  if (realtimeChannel.value) supabase.removeChannel(realtimeChannel.value)
  realtimeChannel.value = supabase
    .channel('dashboard-main-stats')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'check_sessions' }, 
      (payload) => { fetchData() }
    )
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
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
        <p class="text-gray-500 mt-1 flex items-center gap-2">
          ภาพรวมการทำงานประจำวันที่ 
          <span class="font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
            {{ new Date().toLocaleDateString('th-TH', { dateStyle: 'long' }) }}
          </span>
        </p>
      </div>
      <button 
        @click="handleRefresh" 
        :disabled="isRefreshing"
        class="text-sm text-gray-600 hover:text-indigo-600 transition-colors flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-white border border-transparent hover:border-gray-200 hover:shadow-sm active:scale-95 bg-gray-50/50"
      >
         <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isRefreshing }" />
         <span>{{ isRefreshing ? 'กำลังอัปเดต...' : 'อัปเดตข้อมูล' }}</span>
      </button>
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
            <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2 text-lg">
                <div class="p-1.5 bg-indigo-50 rounded-lg">
                   <Building class="w-5 h-5 text-indigo-500" /> 
                </div>
                ความคืบหน้าตามชั้น (รวม 2 รอบ)
            </h3>
            
            <div class="flex-1 overflow-y-auto pr-2 space-y-5 custom-scrollbar">
                <div v-for="floor in floorStats" :key="floor.name" class="space-y-2 group">
                    <div class="flex justify-between text-sm items-end">
                        <span class="font-semibold text-gray-700 group-hover:text-indigo-600 transition-colors">
                            {{ floor.name }}
                        </span>
                        <div class="text-right flex items-baseline gap-1">
                           <span class="font-bold text-lg" :class="floor.completed === floor.total ? 'text-emerald-600' : 'text-gray-800'">
                             {{ floor.completed }}
                           </span>
                           <span class="text-gray-400 text-xs font-medium">/ {{ floor.total }} งาน</span>
                        </div>
                    </div>
                    
                    <div class="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden relative shadow-inner">
                        <div 
                            class="h-full rounded-full transition-all duration-1000 ease-out relative"
                            :class="getProgressColor((floor.completed / floor.total) * 100)"
                            :style="{ width: `${(floor.completed / floor.total) * 100}%` }"
                        >
                            <div class="absolute top-0 left-0 bottom-0 right-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full -translate-x-full animate-shimmer"></div>
                        </div>
                    </div>
                </div>

                <div v-if="floorStats.length === 0" class="flex flex-col items-center justify-center h-full text-gray-400 text-sm opacity-60">
                   <Building class="w-12 h-12 mb-2 stroke-1" />
                   ไม่พบข้อมูลสถานที่
                </div>
            </div>
            
            <div class="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
        </div>
      </div>

      <div class="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
         <div class="p-6 border-b border-gray-100 flex items-center gap-2">
            <div class="p-1.5 bg-indigo-50 rounded-lg">
              <TrendingUp class="w-5 h-5 text-indigo-500" />
            </div>
            <h3 class="font-bold text-gray-800 text-lg">กิจกรรมล่าสุด</h3>
         </div>
         <div class="p-1">
             <RecentActivityList :activities="recentActivities" />
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