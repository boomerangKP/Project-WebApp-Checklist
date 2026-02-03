import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase' // ✅ อย่าลืม import supabase
import { TASK_STATUS } from '@/constants/status'

export const useTaskFilterStore = defineStore('task-filters', () => {
  // --- State เดิม ---
  const activeTab = ref(TASK_STATUS.WAITING)
  const searchQuery = ref('')
  const selectedMaid = ref('all')
  const dateRange = ref('today') 
  const startDate = ref(new Date().toISOString().split('T')[0])
  const endDate = ref(new Date().toISOString().split('T')[0])
  const currentPage = ref(1)
  const itemsPerPage = ref(100)
  const selectedIds = ref([])
  const isSelectionMode = ref(false)

  // --- ✅ State ใหม่ (ต้องมีส่วนนี้ ไม่งั้น Error) ---
  const timeSlots = ref([])
  const locations = ref([])

  // --- Actions ---
  const resetFilters = () => {
    searchQuery.value = ''
    selectedMaid.value = 'all'
    dateRange.value = 'today'
    startDate.value = new Date().toISOString().split('T')[0]
    endDate.value = new Date().toISOString().split('T')[0]
    currentPage.value = 1
    selectedIds.value = []
    isSelectionMode.value = false
  }

  // --- ✅ Action ใหม่: โหลดข้อมูล Master Data ---
  const fetchMasterData = async () => {
    if (timeSlots.value.length > 0 && locations.value.length > 0) {
        return // มีข้อมูลแล้ว ไม่ต้องโหลดซ้ำ
    }

    try {
        const [timesRes, locsRes] = await Promise.all([
            supabase.from('time_slots').select('*').order('time_slots_order'),
            supabase.from('locations').select('*').order('locations_id')
        ])

        if (timesRes.data) timeSlots.value = timesRes.data
        if (locsRes.data) locations.value = locsRes.data
        
    } catch (err) {
        console.error('Error fetching master data:', err)
    }
  }

  return {
    activeTab, searchQuery, selectedMaid, dateRange, startDate, endDate,
    currentPage, itemsPerPage, selectedIds, isSelectionMode,
    // ✅ ต้อง return ตัวแปรเหล่านี้ออกไปให้ useTaskLogic ใช้ได้
    timeSlots,
    locations,
    fetchMasterData,
    resetFilters
  }
})