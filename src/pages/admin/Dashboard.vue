<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-vue-next'

// 👇 Import Components ที่แยกไว้
import StatsCards from '@/components/admin/dashboard/StatsCards.vue'
import TaskTrendsChart from '@/components/admin/dashboard/TaskTrendsChart.vue'
import RecentActivityList from '@/components/admin/dashboard/RecentActivityList.vue'

const loading = ref(true)
const realtimeChannel = ref(null)

const stats = ref({ total: 0, pending: 0, completed: 0, activeStaff: 0 })
const recentActivities = ref([])
const chartData = ref({
  labels: ['รอตรวจสอบ', 'กำลังทำ', 'เสร็จสิ้น', 'พบปัญหา'],
  datasets: [{ data: [0, 0, 0, 0] }]
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { beginAtZero: true, grid: { color: '#f3f4f6' } },
    x: { grid: { display: false } }
  }
}

const getTodayDate = () => new Date().toISOString().split('T')[0]

const fetchData = async () => {
  try {
    const today = getTodayDate()

    // 1. ดึงจำนวน "สถานที่ทั้งหมด" ที่ต้องตรวจ (Active Locations) มาเป็นตัวตั้ง (Total)
    // ตรงนี้สำคัญ! ต้องมี Policy RLS ที่ถูกต้องตามที่เราแก้กันไป ไม่งั้นจะได้ 0
    const { count: totalLocations, error: locError } = await supabase
      .from('locations')
      .select('*', { count: 'exact', head: true }) // head: true คือนับอย่างเดียว ไม่เอาข้อมูล
      .eq('locations_status', 'active')
    
    if (locError) throw locError

    // 2. ดึงข้อมูลการตรวจของวันนี้
    const { data: sessions, error } = await supabase
      .from('check_sessions')
      .select(`*, employees (employees_firstname, employees_lastname, employees_photo), locations (locations_name)`)
      .eq('check_sessions_date', today)
      .order('created_at', { ascending: false })

    if (error) throw error

    // --- 3. คำนวณตัวเลข (Logic ใหม่: เน้นงานที่เหลือ) ---
    
    // นับจำนวนห้องที่ตรวจเสร็จแล้ว (Completed + Fixed + Pass)
    // ใช้ Set เพื่อนับแบบไม่ซ้ำ (เผื่อห้องเดียวตรวจซ้ำ ให้นับเป็น 1 งานเสร็จ)
    const completedSessionIds = sessions.filter(s => ['pass', 'fixed'].includes(s.check_sessions_status))
    const uniqueCompletedLocations = new Set(completedSessionIds.map(s => s.locations_id)).size

    // งานทั้งหมดเป้าหมาย (Total) = จำนวนห้องน้ำทั้งหมดในตึก
    const totalTarget = totalLocations || 0

    // งานที่เสร็จจริง (Completed)
    const completed = uniqueCompletedLocations

    // งานค้าง (Pending) = ทั้งหมด - เสร็จแล้ว (ห้ามติดลบ)
    // นี่คือค่าที่ Admin อยากรู้จริงๆ ว่า "เหลืออีกกี่ห้อง"
    const pending = Math.max(0, totalTarget - completed)

    // ปัญหาที่พบ (Fail)
    const problem = sessions.filter(s => s.check_sessions_status === 'fail').length
    
    // งานที่กำลังทำอยู่ (In Progress)
    const inProgress = sessions.filter(s => s.check_sessions_status === 'in_progress').length

    // จำนวนคนทำงาน
    const uniqueStaff = new Set(sessions.map(s => s.employees_id)).size

    // อัปเดตค่าเข้าตัวแปร Stats
    stats.value = { 
      total: totalTarget, 
      pending: pending, 
      completed: completed, 
      activeStaff: uniqueStaff 
    }

    // เตรียมกราฟ
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
  }
}

const subscribeRealtime = () => {
  realtimeChannel.value = supabase
    .channel('dashboard-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'check_sessions' }, () => {
      fetchData() // ข้อมูลเปลี่ยนปุ๊บ โหลดใหม่ปั๊บ
    })
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
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
      <p class="text-gray-500 mt-1">
        ภาพรวมการทำงานประจำวันที่ {{ new Date().toLocaleDateString('th-TH', { dateStyle: 'long' }) }}
      </p>
    </div>

    <div v-if="loading" class="h-64 flex items-center justify-center">
      <Loader2 class="w-8 h-8 animate-spin text-indigo-600" />
    </div>

    <div v-else class="space-y-6">
      
      <StatsCards :stats="stats" />

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[500px]">
        <TaskTrendsChart :chart-data="chartData" :chart-options="chartOptions" />
        <RecentActivityList :activities="recentActivities" />
      </div>

    </div>
  </div>
</template>