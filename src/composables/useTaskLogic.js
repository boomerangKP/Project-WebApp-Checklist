import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import { useSwal } from '@/composables/useSwal'
import { useUserStore } from '@/stores/user'
import { useTaskFilterStore } from '@/stores/taskFilters'
import { storeToRefs } from 'pinia'
import { TASK_STATUS } from '@/constants/status'

// Helper: Debounce
const debounce = (fn, delay) => {
  let timeout
  return (...args) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), delay)
  }
}

export function useTaskLogic() {
  const userStore = useUserStore()
  const filterStore = useTaskFilterStore()
  const { Swal } = useSwal()

  // --- ดึง State จาก Store ---
  const {
    activeTab,
    searchQuery,
    selectedMaid,
    dateRange,
    startDate,
    endDate,
    currentPage,
    itemsPerPage, 
    isSelectionMode,
    selectedIds,
    timeSlots // ✅ 1. ดึง timeSlots จาก Store แทน Local State
  } = storeToRefs(filterStore)

  // --- Local State ---
  const tasks = ref([])
  const loading = ref(true)
  // const timeSlots = ref([]) // ❌ ลบอันนี้ออก เพราะใช้จาก Store แล้ว
  const isBulkSubmitting = ref(false)
  const totalItemsCount = ref(0)
  const realWaitingCount = ref(0)

  let realtimeSubscription = null

  // --- Helper Functions ---
  
  // ❌ ลบ fetchTimeSlots เดิมออก (ย้ายไป Store แล้ว)
  
  const getSlotName = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    const timeStr = date.toLocaleTimeString('en-GB', { hour12: false })
    // ✅ timeSlots ตรงนี้จะใช้ข้อมูลจาก Store อัตโนมัติ
    const match = timeSlots.value.find(slot => timeStr >= slot.time_slots_start && timeStr < slot.time_slots_end)
    return match ? match.time_slots_name : 'นอกเวลาทำการ'
  }

  // --- Fetch Data ---
  const fetchTasks = async () => {
    loading.value = true
    try {
      // ✅ 2. เรียกใช้ Action จาก Store (ถ้ามีข้อมูลแล้วมันจะไม่โหลดซ้ำ)
      if (timeSlots.value.length === 0) {
        await filterStore.fetchMasterData()
      }

      const from = (currentPage.value - 1) * itemsPerPage.value
      const to = from + itemsPerPage.value - 1

      let query = supabase
        .from('check_sessions')
        .select(`
          check_sessions_id,
          check_sessions_date,
          check_sessions_time_start,
          check_sessions_status,
          created_at,
          checked_at,
          checked_by,
          employees_id,
          employees:employees!check_sessions_employees_id_fkey (
            employees_id,
            employees_firstname,
            employees_lastname,
            employees_photo,
            role
          ),
          locations (
            locations_name,
            locations_building,
            locations_floor
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

      if (startDate.value) query = query.gte('check_sessions_date', startDate.value)
      if (endDate.value) query = query.lte('check_sessions_date', endDate.value)
      
      if (activeTab.value === TASK_STATUS.WAITING) {
        query = query.or(`check_sessions_status.is.null,check_sessions_status.eq.${TASK_STATUS.WAITING}`)
      } else if (activeTab.value === TASK_STATUS.APPROVED) {
         query = query.in('check_sessions_status', TASK_STATUS.GROUP_APPROVED)
      } else if (activeTab.value === TASK_STATUS.REJECTED) {
         query = query.in('check_sessions_status', TASK_STATUS.GROUP_REJECTED)
      }

      // Filter Maid
      if (selectedMaid.value && selectedMaid.value !== 'all') {
         if (!isNaN(selectedMaid.value)) {
             query = query.eq('employees_id', selectedMaid.value) 
         }
      }

      // Search Logic
      if (searchQuery.value && searchQuery.value.trim() !== '') {
         const term = searchQuery.value.trim()
         if (!isNaN(term)) {
            query = query.eq('check_sessions_id', term)
         }
      }

      const { data, count, error } = await query

      if (error) throw error

      tasks.value = data.map(item => {
        let mappedStatus = TASK_STATUS.WAITING
        const s = item.check_sessions_status
        if (TASK_STATUS.GROUP_APPROVED.includes(s)) mappedStatus = TASK_STATUS.APPROVED
        else if (TASK_STATUS.GROUP_REJECTED.includes(s)) mappedStatus = TASK_STATUS.REJECTED
        else mappedStatus = TASK_STATUS.WAITING

        return {
          id: item.check_sessions_id,
          displayId: String(item.check_sessions_id),
          maidId: item.employees?.employees_id,
          maidName: item.employees ? `${item.employees.employees_firstname} ${item.employees.employees_lastname}` : 'ไม่ระบุชื่อ',
          maidRole: item.employees?.role || 'user',
          maidPhoto: item.employees?.employees_photo,
          location: item.locations?.locations_name || 'ไม่ระบุสถานที่',
          floor: item.locations ? `${item.locations.locations_building} ชั้น ${item.locations.locations_floor}` : '-',
          date: new Date(item.check_sessions_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }),
          time: getSlotName(item.created_at),
          status: mappedStatus,
          originalStatus: s,
          rawDate: item.check_sessions_date,
          checkedAt: item.checked_at
        }
      })

      totalItemsCount.value = count || 0
      fetchWaitingCount()

    } catch (err) {
      console.error('Fetch Error:', err)
      Swal.fire('Error', `โหลดข้อมูลไม่สำเร็จ: ${err.message}`, 'error')
    } finally {
      loading.value = false
    }
  }

  const fetchWaitingCount = async () => {
      const { count } = await supabase
        .from('check_sessions')
        .select('*', { count: 'exact', head: true })
        .or(`check_sessions_status.is.null,check_sessions_status.eq.${TASK_STATUS.WAITING}`)
      
      realWaitingCount.value = count || 0
  }

  const uniqueMaids = computed(() => {
    const map = new Map()
    tasks.value.forEach(t => {
      if (t.maidId && t.maidName) {
        map.set(t.maidId, { id: t.maidId, fullname: t.maidName })
      }
    })
    return Array.from(map.values())
  })

  // Computed อื่นๆ คงเดิม
  const filteredTasks = computed(() => tasks.value) 
  const totalPages = computed(() => Math.ceil(totalItemsCount.value / itemsPerPage.value) || 1)
  const paginatedTasks = computed(() => tasks.value)
  const startEntry = computed(() => totalItemsCount.value === 0 ? 0 : (currentPage.value - 1) * itemsPerPage.value + 1)
  const endEntry = computed(() => Math.min(currentPage.value * itemsPerPage.value, totalItemsCount.value))
  const waitingCount = computed(() => realWaitingCount.value)
  const isAllSelected = computed(() => paginatedTasks.value.length > 0 && paginatedTasks.value.every(t => selectedIds.value.includes(t.id)))

  const changePage = (page) => {
    if (page >= 1 && page <= totalPages.value) {
        currentPage.value = page
        fetchTasks()
    }
  }

  const toggleSelection = (id) => {
    if (activeTab.value !== TASK_STATUS.WAITING) return
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

  const handleBulkApprove = async () => {
    if (!userStore.profile?.employees_id) {
        Swal.fire('Error', 'ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่', 'error');
        return;
    }

    const result = await Swal.fire({
      title: `ยืนยันการตรวจสอบ ${selectedIds.value.length} รายการ?`,
      text: 'รายการที่เลือกทั้งหมดจะถูกเปลี่ยนสถานะเป็น "ตรวจแล้ว"',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: 'ยืนยันการตรวจสอบ',
      cancelButtonText: 'ยกเลิก'
    })

    if (result.isConfirmed) {
      isBulkSubmitting.value = true
      try {
        const { error } = await supabase.from('check_sessions')
          .update({
            check_sessions_status: TASK_STATUS.APPROVED,
            updated_at: new Date(),
            checked_at: new Date().toISOString(),
            checked_by: userStore.profile.employees_id 
          })
          .in('check_sessions_id', selectedIds.value)

        if (error) throw error
        
        if (activeTab.value === TASK_STATUS.WAITING) {
            tasks.value = tasks.value.filter(t => !selectedIds.value.includes(t.id))
            if (tasks.value.length === 0 && currentPage.value > 1) {
                currentPage.value--
            }
            await fetchTasks() 
        } else {
            tasks.value = tasks.value.map(t => {
                if (selectedIds.value.includes(t.id)) return { ...t, status: TASK_STATUS.APPROVED }
                return t
            })
        }
        
        realWaitingCount.value = Math.max(0, realWaitingCount.value - selectedIds.value.length)
        selectedIds.value = []
        isSelectionMode.value = false
        Swal.fire({ icon: 'success', title: 'เรียบร้อย!', timer: 1500, showConfirmButton: false })

      } catch (err) {
        Swal.fire('Error', err.message, 'error')
      } finally {
        isBulkSubmitting.value = false
      }
    }
  }

  // Watchers
  watch([activeTab, startDate, endDate], () => {
    currentPage.value = 1
    selectedIds.value = []
    fetchTasks()
  })

  watch(itemsPerPage, () => {
    currentPage.value = 1;
    fetchTasks();
  })

  const onSearchChange = debounce(() => {
      currentPage.value = 1
      fetchTasks()
  }, 500)
  watch(searchQuery, onSearchChange)

  watch(selectedMaid, () => {
      currentPage.value = 1
      fetchTasks()
  })

  watch(isSelectionMode, (newVal) => {
    if (!newVal) {
      selectedIds.value = []
    }
  })

  onMounted(async () => {
    if (!userStore.profile) {
        await userStore.fetchProfile()
    }
    // fetchTimeSlots() // ❌ ไม่ต้องเรียกแล้ว
    await fetchTasks() // ✅ ในนี้จะเรียก fetchMasterData จาก Store ให้เอง
    
    realtimeSubscription = supabase.channel('realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'check_sessions' }, () => {
            fetchWaitingCount()
        }).subscribe()
  })

  onUnmounted(() => {
    if (realtimeSubscription) supabase.removeChannel(realtimeSubscription)
  })

  return {
    tasks, loading, activeTab, searchQuery, selectedMaid,
    dateRange,
    startDate, endDate, currentPage, itemsPerPage,
    isSelectionMode, selectedIds, isBulkSubmitting,
    uniqueMaids, 
    filteredTasks, 
    paginatedTasks, totalPages,
    startEntry, endEntry, waitingCount, isAllSelected,
    totalItemsCount,
    fetchTasks, changePage, toggleSelection, toggleSelectAll, handleBulkApprove
  }
}