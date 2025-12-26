<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { supabase } from '@/lib/supabase'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router' 
import { Filter, ArrowLeft, Loader2, CalendarDays } from 'lucide-vue-next'

// Import Components
import HistoryFilter from '@/components/maid/history/HistoryFilter.vue'
import HistoryCard from '@/components/maid/history/HistoryCard.vue'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(true)
const historyItems = ref([])
const locationsList = ref([])

const isFilterOpen = ref(false)
const activeFilter = ref({ status: 'all', period: 'all', location: '' })
let realtimeSubscription = null

// --- Fetch Data ---
const fetchLocations = async () => {
  const { data } = await supabase.from('locations').select('locations_id, locations_name, locations_building').eq('locations_status', 'active')
  if (data) locationsList.value = data
}

const fetchHistory = async () => {
  try {
    loading.value = true
    let query = supabase.from('check_sessions')
      .select(`*, locations (locations_name, locations_building, locations_floor), restroom_types (restroom_types_name)`)
      .eq('employees_id', userStore.profile.employees_id)
      .order('created_at', { ascending: false })

    if (activeFilter.value.status !== 'all') {
      if (activeFilter.value.status === 'pass') query = query.in('check_sessions_status', ['pass', 'fixed', 'approved'])
      else if (activeFilter.value.status === 'fail') query = query.in('check_sessions_status', ['fail', 'rejected'])
      else if (activeFilter.value.status === 'waiting') query = query.in('check_sessions_status', ['waiting', 'in_progress'])
    }
    if (activeFilter.value.location) query = query.eq('locations_id', activeFilter.value.location)
    
    const now = new Date()
    if (activeFilter.value.period === 'today') {
       const start = new Date(now.setHours(0,0,0,0)).toISOString()
       query = query.gte('created_at', start)
    }

    const { data, error } = await query.limit(50)
    if (error) throw error
    historyItems.value = data
  } catch (err) { console.error(err) } finally { loading.value = false }
}

const handleApplyFilter = (filterValues) => {
  activeFilter.value = filterValues
  fetchHistory()
}

const subscribeRealtime = () => {
  realtimeSubscription = supabase
    .channel('maid-history-update')
    .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'check_sessions',
        filter: `employees_id=eq.${userStore.profile.employees_id}`
      }, (payload) => {
        const updatedTask = payload.new
        const index = historyItems.value.findIndex(item => item.check_sessions_id === updatedTask.check_sessions_id)
        if (index !== -1) {
          historyItems.value[index].check_sessions_status = updatedTask.check_sessions_status
          historyItems.value[index].supervisor_comment = updatedTask.supervisor_comment
        }
      }
    ).subscribe()
}

onMounted(() => {
  fetchLocations()
  fetchHistory()
  subscribeRealtime()
})

onUnmounted(() => {
  if (realtimeSubscription) supabase.removeChannel(realtimeSubscription)
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-24">
    
    <div class="bg-white p-4 shadow-sm sticky top-0 z-10 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <button @click="router.back()" class="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
          <ArrowLeft class="w-6 h-6" />
        </button>
        <h1 class="text-xl font-bold text-gray-800">ประวัติการส่งงาน</h1>
      </div>
      <button @click="isFilterOpen = true" class="p-2 -mr-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors relative">
        <Filter class="w-6 h-6" />
        <span v-if="activeFilter.status !== 'all' || activeFilter.period !== 'all'" class="absolute top-2 right-2 w-2 h-2 bg-indigo-600 rounded-full border border-white"></span>
      </button>
    </div>

    <div class="p-4 space-y-4">
       <div v-if="loading" class="flex flex-col items-center justify-center py-10 text-gray-400">
          <Loader2 class="w-8 h-8 animate-spin mb-2" />
          <p>กำลังโหลดข้อมูล...</p>
       </div>

       <div v-else-if="historyItems.length === 0" class="flex flex-col items-center justify-center py-20 text-gray-400">
          <CalendarDays class="w-16 h-16 mb-4 opacity-20" />
          <p>ไม่พบประวัติการส่งงาน</p>
       </div>

       <div v-else>
          <HistoryCard 
             v-for="item in historyItems" 
             :key="item.check_sessions_id" 
             :item="item" 
             class="mb-3"
             @click="router.push(`/maid/history/${item.check_sessions_id}`)"
          />
       </div>
    </div>

    <HistoryFilter 
      :is-open="isFilterOpen" 
      :locations="locationsList"
      @close="isFilterOpen = false"
      @apply="handleApplyFilter"
    />
  </div>
</template>