import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import Swal from 'sweetalert2'

export function useTaskLogic() {
  const tasks = ref([])
  const loading = ref(true)
  const timeSlots = ref([])
  
  // Filter State
  const activeTab = ref('waiting')
  const searchQuery = ref('')
  const selectedMaid = ref('all')

  // Pagination State
  const currentPage = ref(1)
  const itemsPerPage = ref(10)

  // Selection State
  const isSelectionMode = ref(false)
  const selectedIds = ref([])
  const isBulkSubmitting = ref(false)

  let realtimeSubscription = null

  // --- Helper Functions ---
  const fetchTimeSlots = async () => {
    const { data } = await supabase.from('time_slots').select('*').order('time_slots_order')
    if (data) timeSlots.value = data
  }

  const getSlotName = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    const timeStr = date.toLocaleTimeString('en-GB', { hour12: false })
    const match = timeSlots.value.find(slot => timeStr >= slot.time_slots_start && timeStr < slot.time_slots_end)
    return match ? match.time_slots_name : 'นอกเวลาทำการ'
  }

  // --- Fetch Data ---
  const fetchTasks = async () => {
    loading.value = true
    try {
      if (timeSlots.value.length === 0) await fetchTimeSlots()

      const d = new Date()
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

      const { data, error } = await supabase.from('check_sessions').select(`
          check_sessions_id, check_sessions_date, check_sessions_time_start, check_sessions_status, created_at,
          employees ( employees_firstname, employees_lastname, employees_photo, role ),
          locations ( locations_name, locations_building, locations_floor )
        `)
        .eq('check_sessions_date', today)
        .order('created_at', { ascending: false })

      if (error) throw error

      tasks.value = data.map(item => {
        let mappedStatus = 'waiting'
        const s = item.check_sessions_status
        if (['approved', 'pass', 'fixed'].includes(s)) mappedStatus = 'approved'
        else if (['rejected', 'fail'].includes(s)) mappedStatus = 'rejected'
        else mappedStatus = 'waiting'

        return {
          id: item.check_sessions_id,
          maidName: item.employees ? `${item.employees.employees_firstname} ${item.employees.employees_lastname}` : 'ไม่ระบุชื่อ',
          maidRole: item.employees?.role === 'maid' ? 'พนักงานทำความสะอาด' : 'พนักงาน',
          maidPhoto: item.employees?.employees_photo,
          location: item.locations?.locations_name || 'ไม่ระบุสถานที่',
          floor: item.locations ? `${item.locations.locations_building} ชั้น ${item.locations.locations_floor}` : '-',
          date: new Date(item.check_sessions_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }),
          time: getSlotName(item.created_at),
          status: mappedStatus,
          originalStatus: s
        }
      })
    } catch (err) {
      console.error(err)
      Swal.fire('Error', 'ไม่สามารถโหลดข้อมูลได้', 'error')
    } finally {
      loading.value = false
    }
  }

  // --- Filter & Pagination ---
  const uniqueMaids = computed(() => [...new Set(tasks.value.map(t => t.maidName))])
  
  const filteredTasks = computed(() => tasks.value.filter(t => {
    return (activeTab.value === 'all' || t.status === activeTab.value) &&
           (t.maidName.includes(searchQuery.value) || t.location.includes(searchQuery.value)) &&
           (selectedMaid.value === 'all' || t.maidName === selectedMaid.value)
  }))

  const totalPages = computed(() => Math.ceil(filteredTasks.value.length / itemsPerPage.value) || 1)
  
  const paginatedTasks = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value
    const end = start + itemsPerPage.value
    return filteredTasks.value.slice(start, end)
  })

  const startEntry = computed(() => filteredTasks.value.length === 0 ? 0 : (currentPage.value - 1) * itemsPerPage.value + 1)
  const endEntry = computed(() => Math.min(currentPage.value * itemsPerPage.value, filteredTasks.value.length))

  const waitingCount = computed(() => tasks.value.filter(t => t.status === 'waiting').length)

  // --- Actions ---
  const changePage = (page) => {
    if (page >= 1 && page <= totalPages.value) currentPage.value = page
  }

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

  // --- Bulk Approve ---
  const handleBulkApprove = async () => {
    const result = await Swal.fire({
      title: `ยืนยันอนุมัติ ${selectedIds.value.length} รายการ?`,
      text: 'รายการที่เลือกทั้งหมดจะถูกเปลี่ยนสถานะเป็น "อนุมัติ"',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: 'ยืนยันอนุมัติ',
      cancelButtonText: 'ยกเลิก'
    })

    if (result.isConfirmed) {
      isBulkSubmitting.value = true
      Swal.fire({ title: 'กำลังประมวลผล...', didOpen: () => Swal.showLoading() })
      try {
        const { error } = await supabase.from('check_sessions')
          .update({ check_sessions_status: 'approved', updated_at: new Date() })
          .in('check_sessions_id', selectedIds.value)
        if (error) throw error
        await fetchTasks()
        selectedIds.value = []
        isSelectionMode.value = false
        Swal.fire({ icon: 'success', title: 'เรียบร้อย!', timer: 1500, showConfirmButton: false })
      } catch (err) { Swal.fire('Error', err.message, 'error') } 
      finally { isBulkSubmitting.value = false }
    }
  }

  // --- Lifecycle ---
  watch([activeTab, itemsPerPage, searchQuery, selectedMaid], () => {
    currentPage.value = 1; selectedIds.value = []; isSelectionMode.value = false
  })

  onMounted(() => {
    fetchTimeSlots(); fetchTasks()
    realtimeSubscription = supabase.channel('realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'check_sessions' }, fetchTasks).subscribe()
  })
  
  onUnmounted(() => { if (realtimeSubscription) supabase.removeChannel(realtimeSubscription) })

  return {
    tasks, loading, activeTab, searchQuery, selectedMaid,
    currentPage, itemsPerPage, isSelectionMode, selectedIds, isBulkSubmitting,
    uniqueMaids, filteredTasks, paginatedTasks, totalPages, startEntry, endEntry, waitingCount, isAllSelected,
    fetchTasks, changePage, toggleSelection, toggleSelectAll, handleBulkApprove
  }
}