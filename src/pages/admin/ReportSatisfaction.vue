<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import { 
  Heart, Star, TrendingUp, Calendar, Filter,
  MessageSquare, AlertCircle, Loader2
} from 'lucide-vue-next'

// --- Chart.js Setup ---
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line, Bar } from 'vue-chartjs'

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, 
  BarElement, Title, Tooltip, Legend, Filler
)

// --- State ---
const loading = ref(true)
const feedbacks = ref([])
const dateFilter = ref('month') // today, week, month, year, all

// Stats
const stats = ref({
  totalReviews: 0,
  averageRating: 0,
  starDistribution: { 5:0, 4:0, 3:0, 2:0, 1:0 },
  topTopic: '-',
  lowTopic: '-'
})

// Chart Data Containers
const trendChartData = ref({ labels: [], datasets: [] })
const topicChartData = ref({ labels: [], datasets: [] })

// --- Helper Functions ---
const getDateRange = (filter) => {
  const now = new Date()
  if (filter === 'today') return new Date(now.setHours(0,0,0,0)).toISOString()
  if (filter === 'week') {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString()
  }
  if (filter === 'month') {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d.toISOString()
  }
  if (filter === 'year') {
    const d = new Date()
    d.setFullYear(d.getFullYear() - 1)
    return d.toISOString()
  }
  return null // all
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('th-TH', {
    day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute:'2-digit'
  })
}

// --- Fetch Data ---
const fetchData = async () => {
  loading.value = true
  try {
    let query = supabase
      .from('feedbacks')
      .select(`
        *,
        locations (locations_name, locations_building, locations_floor),
        feedback_details (
          rating,
          feedback_topics (name)
        )
      `)
      .order('created_at', { ascending: false })

    // Apply Date Filter
    const startDate = getDateRange(dateFilter.value)
    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    const { data, error } = await query
    if (error) throw error

    feedbacks.value = data || []
    calculateStats(data)
    prepareCharts(data)

  } catch (err) {
    console.error('Error fetching report:', err)
  } finally {
    loading.value = false
  }
}

// --- Calculate Logic ---
const calculateStats = (data) => {
  if (!data.length) {
    stats.value = { totalReviews: 0, averageRating: 0, starDistribution: {5:0,4:0,3:0,2:0,1:0}, topTopic: '-', lowTopic: '-' }
    return
  }

  // 1. Basic Stats
  const total = data.length
  const sumRating = data.reduce((acc, cur) => acc + cur.rating, 0)
  const avg = sumRating / total

  // 2. Star Distribution
  const dist = { 5:0, 4:0, 3:0, 2:0, 1:0 }
  data.forEach(f => {
    const r = Math.round(f.rating)
    if (dist[r] !== undefined) dist[r]++
  })

  // 3. Topic Analysis (เจาะลึกรายหัวข้อ)
  const topicScores = {} // { 'ความสะอาด': { sum: 20, count: 5 } }
  
  data.forEach(f => {
    if (f.feedback_details) {
      f.feedback_details.forEach(d => {
        const topicName = d.feedback_topics?.name || 'อื่นๆ'
        if (!topicScores[topicName]) topicScores[topicName] = { sum: 0, count: 0 }
        topicScores[topicName].sum += d.rating
        topicScores[topicName].count += 1
      })
    }
  })

  // Find Top & Low Topic
  let bestTopic = { name: '-', avg: -1 }
  let worstTopic = { name: '-', avg: 6 }

  for (const [name, val] of Object.entries(topicScores)) {
    const topicAvg = val.sum / val.count
    if (topicAvg > bestTopic.avg) bestTopic = { name, avg: topicAvg }
    if (topicAvg < worstTopic.avg) worstTopic = { name, avg: topicAvg }
  }

  stats.value = {
    totalReviews: total,
    averageRating: avg.toFixed(1),
    starDistribution: dist,
    topTopic: bestTopic.name !== '-' ? `${bestTopic.name} (${bestTopic.avg.toFixed(1)})` : '-',
    lowTopic: worstTopic.name !== '-' ? `${worstTopic.name} (${worstTopic.avg.toFixed(1)})` : '-'
  }
}

const prepareCharts = (data) => {
  // --- 1. Line Chart (Trend by Date) ---
  const dateMap = {}
  data.forEach(f => {
    const d = new Date(f.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
    if (!dateMap[d]) dateMap[d] = { sum: 0, count: 0 }
    dateMap[d].sum += f.rating
    dateMap[d].count++
  })

  // Sort by date (ย้อนหลัง -> ปัจจุบัน)
  // หมายเหตุ: Logic เรียงวันที่แบบง่าย (ถ้าข้ามปีอาจต้องปรับปรุง)
  const labels = Object.keys(dateMap).reverse() 
  const trendData = labels.map(d => (dateMap[d].sum / dateMap[d].count).toFixed(1))

  trendChartData.value = {
    labels: labels,
    datasets: [{
      label: 'คะแนนความพึงพอใจเฉลี่ย',
      data: trendData,
      borderColor: '#4f46e5',
      backgroundColor: 'rgba(79, 70, 229, 0.1)',
      fill: true,
      tension: 0.4
    }]
  }

  // --- 2. Bar Chart (Average by Topic) ---
  const topicMap = {}
  data.forEach(f => {
    f.feedback_details?.forEach(d => {
      const name = d.feedback_topics?.name
      if (name) {
        if (!topicMap[name]) topicMap[name] = { sum: 0, count: 0 }
        topicMap[name].sum += d.rating
        topicMap[name].count++
      }
    })
  })

  const topicLabels = Object.keys(topicMap)
  const topicScores = topicLabels.map(t => (topicMap[t].sum / topicMap[t].count).toFixed(1))

  topicChartData.value = {
    labels: topicLabels,
    datasets: [{
      label: 'คะแนนเฉลี่ยรายหัวข้อ',
      data: topicScores,
      backgroundColor: topicScores.map(s => s >= 4 ? '#10b981' : s >= 3 ? '#f59e0b' : '#ef4444'),
      borderRadius: 6
    }]
  }
}

// Watch Filter Change
watch(dateFilter, () => fetchData())

onMounted(fetchData)
</script>

<template>
  <div class="space-y-6 pb-10">
    
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Heart class="w-7 h-7 text-pink-500 fill-pink-500" /> รายงานความพึงพอใจ
        </h1>
        <p class="text-gray-500 text-sm mt-1">สรุปคะแนนการประเมินจากผู้ใช้บริการ</p>
      </div>

      <div class="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
        <button 
          v-for="f in ['today', 'week', 'month', 'all']" 
          :key="f"
          @click="dateFilter = f"
          class="px-4 py-1.5 text-xs font-medium rounded-md transition-all"
          :class="dateFilter === f ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'"
        >
          {{ f === 'today' ? 'วันนี้' : f === 'week' ? 'สัปดาห์นี้' : f === 'month' ? 'เดือนนี้' : 'ทั้งหมด' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="h-64 flex flex-col items-center justify-center">
      <Loader2 class="w-10 h-10 animate-spin text-indigo-500 mb-2" />
      <span class="text-gray-400">กำลังประมวลผลข้อมูล...</span>
    </div>

    <div v-else class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32">
          <div class="flex justify-between items-start">
             <div>
               <p class="text-xs font-bold text-gray-400 uppercase">จำนวนผู้ประเมิน</p>
               <h3 class="text-3xl font-bold text-gray-800 mt-1">{{ stats.totalReviews }}</h3>
             </div>
             <div class="p-2 bg-blue-50 rounded-lg text-blue-600">
               <MessageSquare class="w-5 h-5" />
             </div>
          </div>
          <p class="text-xs text-gray-400">ครั้ง ในช่วงเวลาที่เลือก</p>
        </div>

        <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32">
          <div class="flex justify-between items-start">
             <div>
               <p class="text-xs font-bold text-gray-400 uppercase">คะแนนเฉลี่ยรวม</p>
               <div class="flex items-end gap-2 mt-1">
                 <h3 class="text-3xl font-bold text-indigo-600">{{ stats.averageRating }}</h3>
                 <span class="text-sm text-gray-400 mb-1">/ 5.0</span>
               </div>
             </div>
             <div class="p-2 bg-yellow-50 rounded-lg text-yellow-500">
               <Star class="w-5 h-5 fill-yellow-500" />
             </div>
          </div>
          <div class="flex gap-0.5 mt-2">
            <Star v-for="i in 5" :key="i" class="w-3 h-3" 
                  :class="i <= Math.round(stats.averageRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'" />
          </div>
        </div>

        <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32">
          <div>
            <p class="text-xs font-bold text-gray-400 uppercase">จุดเด่น (คะแนนสูงสุด)</p>
            <h3 class="text-lg font-bold text-emerald-600 mt-2 truncate">{{ stats.topTopic }}</h3>
          </div>
          <div class="w-full bg-gray-100 rounded-full h-1.5 mt-2">
            <div class="bg-emerald-500 h-1.5 rounded-full" style="width: 80%"></div>
          </div>
        </div>

        <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-32">
          <div>
            <p class="text-xs font-bold text-gray-400 uppercase">ควรปรับปรุง (คะแนนต่ำสุด)</p>
            <h3 class="text-lg font-bold text-red-500 mt-2 truncate">{{ stats.lowTopic }}</h3>
          </div>
          <div class="w-full bg-gray-100 rounded-full h-1.5 mt-2">
            <div class="bg-red-500 h-1.5 rounded-full" style="width: 40%"></div>
          </div>
        </div>

      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div class="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
             <TrendingUp class="w-5 h-5 text-indigo-500" /> แนวโน้มคะแนนความพึงพอใจ
          </h3>
          <div class="h-64">
             <Line v-if="trendChartData.labels.length" :data="trendChartData" :options="{ responsive: true, maintainAspectRatio: false }" />
             <div v-else class="h-full flex items-center justify-center text-gray-400">ไม่มีข้อมูลสำหรับกราฟ</div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
             <Filter class="w-5 h-5 text-indigo-500" /> คะแนนรายหัวข้อ
          </h3>
          <div class="h-64">
             <Bar v-if="topicChartData.labels.length" :data="topicChartData" :options="{ indexAxis: 'y', responsive: true, maintainAspectRatio: false }" />
             <div v-else class="h-full flex items-center justify-center text-gray-400">ไม่มีข้อมูลสำหรับกราฟ</div>
          </div>
        </div>

      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="p-6 border-b border-gray-50 flex justify-between items-center">
           <h3 class="font-bold text-gray-800 text-lg">รายการประเมินล่าสุด</h3>
           <span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{{ feedbacks.length }} รายการ</span>
        </div>
        
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead class="bg-gray-50 text-xs text-gray-500 uppercase font-bold tracking-wider">
              <tr>
                <th class="px-6 py-4">วันที่ / เวลา</th>
                <th class="px-6 py-4">สถานที่</th>
                <th class="px-6 py-4 text-center">คะแนน</th>
                <th class="px-6 py-4">ข้อเสนอแนะ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-if="feedbacks.length === 0">
                 <td colspan="4" class="px-6 py-10 text-center text-gray-400">ไม่พบข้อมูลการประเมิน</td>
              </tr>
              <tr v-for="item in feedbacks.slice(0, 10)" :key="item.id" class="hover:bg-gray-50/50 transition-colors">
                <td class="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                  <div class="flex items-center gap-2">
                    <Calendar class="w-4 h-4 text-gray-400" />
                    {{ formatDate(item.created_at) }}
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="text-sm font-bold text-gray-800">{{ item.locations?.locations_name }}</div>
                  <div class="text-xs text-gray-500">{{ item.locations?.locations_building }} ชั้น {{ item.locations?.locations_floor }}</div>
                </td>
                <td class="px-6 py-4 text-center">
                  <div class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold"
                       :class="item.rating >= 4 ? 'bg-green-50 text-green-600' : item.rating >= 3 ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-600'">
                     <Star class="w-3 h-3 fill-current" />
                     {{ item.rating }}
                  </div>
                </td>
                <td class="px-6 py-4 text-sm text-gray-600">
                  <p v-if="item.comment" class="line-clamp-2">"{{ item.comment }}"</p>
                  <span v-else class="text-gray-300">-</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="feedbacks.length > 10" class="p-4 bg-gray-50 text-center border-t border-gray-100">
           <button class="text-sm text-indigo-600 hover:text-indigo-800 font-medium">ดูทั้งหมด</button>
        </div>
      </div>

    </div>
  </div>
</template>