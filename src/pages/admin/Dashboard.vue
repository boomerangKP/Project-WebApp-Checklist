<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { supabase } from '@/lib/supabase'
import { Loader2, Building, BarChart3, RefreshCw } from 'lucide-vue-next'

// Components
import StatsCards from '@/components/admin/dashboard/StatsCards.vue'
import TaskTrendsChart from '@/components/admin/dashboard/TaskTrendsChart.vue'
import RecentActivityList from '@/components/admin/dashboard/RecentActivityList.vue'

// --- State ---
const loading = ref(true)
const isRefreshing = ref(false) // State สำหรับปุ่มหมุนๆ ตอนกด Refresh
const realtimeChannel = ref(null)

const stats = ref({ total: 0, pending: 0, completed: 0, activeStaff: 0 })
const recentActivities = ref([])
const floorStats = ref([]) // 🔥 เก็บข้อมูลแยกรายชั้น

// Config Chart
const chartData = ref({
  labels: ['รอตรวจสอบ', 'กำลังทำ', 'เสร็จสิ้น', 'พบปัญหา'],
  datasets: [{ data: [0, 0, 0, 0] }]
})
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  // 🔥 เพิ่มส่วนนี้เข้าไปครับ: สั่งให้กราฟมีระยะห่างจากขอบ
  layout: {
    padding: {
      bottom: 20, // เพิ่มพื้นที่ด้านล่าง 20px ให้ Tooltip ไม่ตกขอบ
      left: 10,
      right: 10,
      top: 10
    }
  },
  scales: {
    y: { 
      beginAtZero: true, 
      grid: { color: '#f3f4f6' },
      ticks: { precision: 0 } // (แถม) ทำให้แกน Y โชว์แค่เลขจำนวนเต็ม ไม่เอาทศนิยม
    },
    x: { grid: { display: false } }
  }
}

// --- Helpers ---
// ดึงวันที่ปัจจุบันแบบ Local (ไม่เอา UTC) เพื่อให้ตรงกับที่แม่บ้านส่ง
const getTodayDate = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// เลือกสีหลอดพลังตามเปอร์เซ็นต์
const getProgressColor = (percent) => {
  if (percent === 100) return 'bg-emerald-500' // เขียวสวยๆ
  if (percent >= 50) return 'bg-blue-500'    // ฟ้า
  return 'bg-amber-500'                      // ส้ม
}

// --- Main Fetch Logic ---
const fetchData = async () => {
  try {
    const today = getTodayDate()
    console.log('📅 Dashboard Fetching:', today)

    // 1. ดึงเป้าหมายสถานที่ทั้งหมด (Active Locations)
    const { data: allLocations, error: locError } = await supabase
      .from('locations')
      .select('locations_id, locations_building, locations_floor')
      .eq('locations_status', 'active')
    
    if (locError) throw locError

    // 2. ดึงงานที่ส่งมา "วันนี้"
    const { data: sessions, error } = await supabase
      .from('check_sessions')
      .select(`*, locations(locations_id, locations_building, locations_floor), employees(*)`)
      .eq('check_sessions_date', today)
      .order('created_at', { ascending: false })

    if (error) throw error

    // --- 3. คำนวณ Stats ภาพรวม ---
    const completedSessionIds = sessions.filter(s => ['pass', 'fixed', 'approved'].includes(s.check_sessions_status))
    // ใช้ Set กันเหนียว (เผื่อ Database มีข้อมูลเบิ้ล หรือส่งซ้ำ)
    const completedLocIds = new Set(completedSessionIds.map(s => s.locations_id))

    const totalTarget = allLocations.length
    const completed = completedLocIds.size
    const pending = Math.max(0, totalTarget - completed)
    const problem = sessions.filter(s => ['fail', 'rejected'].includes(s.check_sessions_status)).length
    const inProgress = sessions.filter(s => ['in_progress', 'waiting'].includes(s.check_sessions_status)).length
    const uniqueStaff = new Set(sessions.map(s => s.employees_id)).size

    stats.value = { total: totalTarget, pending, completed, activeStaff: uniqueStaff }

    // --- 4. คำนวณแยกตามชั้น (Group by Floor) ---
    const floorsMap = {}

    // 4.1 วนลูปสถานที่ทั้งหมด เพื่อตั้งฐาน (Total per floor)
    allLocations.forEach(loc => {
        // สร้าง Key เช่น "อาคาร A|ชั้น 1" เพื่อ Group
        const key = `${loc.locations_building}|${loc.locations_floor}`
        if (!floorsMap[key]) {
            floorsMap[key] = { 
                name: `อาคาร ${loc.locations_building} ชั้น ${loc.locations_floor}`,
                building: loc.locations_building,
                floor: parseInt(loc.locations_floor) || 0,
                total: 0, 
                completed: 0 
            }
        }
        floorsMap[key].total += 1
        
        // 4.2 เช็คว่าห้องนี้เสร็จหรือยัง (โดยดูจาก ID ที่อยู่ใน Set completedLocIds)
        if (completedLocIds.has(loc.locations_id)) {
            floorsMap[key].completed += 1
        }
    })

    // 4.3 แปลงเป็น Array แล้วเรียงลำดับ (เรียงตึก A->Z, เรียงชั้น 1->9)
    floorStats.value = Object.values(floorsMap).sort((a, b) => {
        if (a.building !== b.building) return a.building.localeCompare(b.building)
        return a.floor - b.floor
    })

    // --- 5. อัปเดตกราฟ ---
    chartData.value = {
      labels: ['รอตรวจสอบ', 'กำลังทำ', 'เรียบร้อย', 'พบปัญหา'],
      datasets: [{
        label: 'จำนวนรายการ',
        backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#ef4444'],
        borderRadius: 6,
        data: [pending, inProgress, completed, problem]
      }]
    }

    recentActivities.value = sessions.slice(0, 10)

  } catch (err) {
    console.error('Error fetching dashboard:', err)
  } finally {
    loading.value = false
    isRefreshing.value = false
  }
}

// Wrapper สำหรับปุ่ม Refresh (ให้หมุนติ้วๆ)
const handleRefresh = async () => {
    isRefreshing.value = true
    await fetchData()
}

// --- Realtime Subscription ---
const subscribeRealtime = () => {
  realtimeChannel.value = supabase
    .channel('dashboard-realtime-channel')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'check_sessions' }, 
      (payload) => {
        console.log('🔔 Realtime Update!', payload)
        fetchData() // ข้อมูลเปลี่ยนปุ๊บ ดึงใหม่ปั๊บ
      }
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
          <span class="font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
            {{ new Date().toLocaleDateString('th-TH', { dateStyle: 'long' }) }}
          </span>
        </p>
      </div>
      <button 
        @click="handleRefresh" 
        :disabled="isRefreshing"
        class="text-sm text-gray-500 hover:text-indigo-600 transition-colors flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200"
      >
         <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isRefreshing }" />
         <span>{{ isRefreshing ? 'กำลังโหลด...' : 'อัปเดตข้อมูล' }}</span>
      </button>
    </div>

    <div v-if="loading" class="h-64 flex items-center justify-center bg-white rounded-2xl shadow-sm border border-gray-100">
      <div class="flex flex-col items-center gap-3">
        <Loader2 class="w-10 h-10 animate-spin text-indigo-600" />
        <span class="text-gray-400 text-sm">กำลังประมวลผลข้อมูล...</span>
      </div>
    </div>

    <div v-else class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <StatsCards :stats="stats" />

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div class="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[450px] flex flex-col">
            <h3 class="font-bold text-gray-800 mb-6 flex items-center gap-2">
                <BarChart3 class="w-5 h-5 text-indigo-500" /> 
                สถิติสถานะงานวันนี้
            </h3>
            <div class="flex-1 w-full min-h-0 relative overflow-hidden">
                 <TaskTrendsChart :chart-data="chartData" :chart-options="chartOptions" />
            </div>
        </div>

        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-[450px]">
            <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Building class="w-5 h-5 text-indigo-500" /> 
                ความคืบหน้าตามชั้น
            </h3>
            
            <div class="flex-1 overflow-y-auto pr-2 space-y-5 custom-scrollbar">
                <div v-for="floor in floorStats" :key="floor.name" class="space-y-1.5 group">
                    <div class="flex justify-between text-sm items-end">
                        <span class="font-semibold text-gray-700 group-hover:text-indigo-600 transition-colors">
                            {{ floor.name }}
                        </span>
                        <div class="text-right">
                           <span class="font-bold" :class="floor.completed === floor.total ? 'text-emerald-600' : 'text-gray-800'">
                             {{ floor.completed }}
                           </span>
                           <span class="text-gray-400 text-xs"> / {{ floor.total }} ห้อง</span>
                        </div>
                    </div>
                    
                    <div class="h-3 w-full bg-gray-100 rounded-full overflow-hidden relative shadow-inner">
                        <div 
                            class="h-full rounded-full transition-all duration-1000 ease-out relative"
                            :class="getProgressColor((floor.completed / floor.total) * 100)"
                            :style="{ width: `${(floor.completed / floor.total) * 100}%` }"
                        >
                            <div class="absolute top-0 left-0 bottom-0 right-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-full -translate-x-full animate-shimmer"></div>
                        </div>
                    </div>
                </div>
                
                <div v-if="floorStats.length === 0" class="flex flex-col items-center justify-center h-full text-gray-400 text-sm">
                   <Building class="w-8 h-8 mb-2 opacity-20" />
                   ไม่พบข้อมูลสถานที่
                </div>
            </div>
        </div>

      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-1">
         <RecentActivityList :activities="recentActivities" />
      </div>

    </div>
  </div>
</template>

<style scoped>
/* Scrollbar สวยๆ */
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}

/* Animation แสงวิ่งวิบวับ (Shimmer) */
@keyframes shimmer {
  100% { transform: translateX(100%); }
}
.animate-shimmer {
  animation: shimmer 2.5s infinite linear;
}
</style>