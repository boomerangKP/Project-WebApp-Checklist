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

  // --- State ---
  const {
    activeTab, searchQuery, selectedMaid, dateRange,
    startDate, endDate, currentPage, itemsPerPage, 
    isSelectionMode, selectedIds, timeSlots
  } = storeToRefs(filterStore)

  // --- Local State ---
  const tasks = ref([])
  const loading = ref(true)
  const isBulkSubmitting = ref(false)
  const totalItemsCount = ref(0)
  const realWaitingCount = ref(0)
  let realtimeSubscription = null

  // --- Helper Functions ---
  const getSlotName = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    const timeStr = date.toLocaleTimeString('en-GB', { hour12: false })
    const match = timeSlots.value.find(slot => timeStr >= slot.time_slots_start && timeStr < slot.time_slots_end)
    return match ? match.time_slots_name : 'นอกเวลาทำการ'
  }

  // --- Fetch Data ---
  const fetchTasks = async (enableLoading = true) => {
    if (enableLoading) loading.value = true
    
    try {
      if (timeSlots.value.length === 0) {
        await filterStore.fetchMasterData()
      }

      const from = (currentPage.value - 1) * itemsPerPage.value
      const to = from + itemsPerPage.value - 1

      // ✅ Base Query
      // ใช้ locations!inner เพื่อการันตีว่าต้องมีข้อมูลสถานที่ (แต่การกรอง Search จะทำผ่าน ID แทน)
      let query = supabase
        .from('check_sessions')
        .select(`
          check_sessions_id,
          check_sessions_date,
          check_sessions_time_start,
          check_sessions_status,
          created_at, checked_at, checked_by, employees_id, locations_id,
          employees:employees!check_sessions_employees_id_fkey (
            employees_id, employees_firstname, employees_lastname, employees_photo, role
          ),
          locations!inner (
            locations_name, locations_building, locations_floor
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

      // Filter: วันที่
      if (startDate.value) query = query.gte('check_sessions_date', startDate.value)
      if (endDate.value) query = query.lte('check_sessions_date', endDate.value)
      
      // Filter: สถานะ
      if (activeTab.value === TASK_STATUS.WAITING) {
        query = query.or(`check_sessions_status.is.null,check_sessions_status.eq.${TASK_STATUS.WAITING}`)
      } else if (activeTab.value === TASK_STATUS.APPROVED) {
         query = query.in('check_sessions_status', TASK_STATUS.GROUP_APPROVED)
      } else if (activeTab.value === TASK_STATUS.REJECTED) {
         query = query.in('check_sessions_status', TASK_STATUS.GROUP_REJECTED)
      }

      // Filter: แม่บ้าน (Dropdown)
      if (selectedMaid.value && selectedMaid.value !== 'all') {
         if (selectedMaid.value) {
             query = query.eq('employees_id', selectedMaid.value) 
         }
      }

      // ✅ Expert Search Logic (แก้ให้หาเจอทั้งคนและสถานที่)
      if (searchQuery.value && searchQuery.value.trim() !== '') {
         const term = searchQuery.value.trim()
         const orConditions = []

         // 1. ถ้าเป็นตัวเลข -> หาจาก ID งาน
         if (!isNaN(term)) {
            orConditions.push(`check_sessions_id.eq.${term}`)
         }

         // 2. Pre-fetch: หา ID ของพนักงานที่ชื่อตรงกับ "สม..."
         const { data: empData } = await supabase
            .from('employees')
            .select('employees_id')
            .or(`employees_firstname.ilike.%${term}%,employees_lastname.ilike.%${term}%`)
         
         const matchedEmpIds = empData?.map(e => e.employees_id) || []
         if (matchedEmpIds.length > 0) {
            orConditions.push(`employees_id.in.(${matchedEmpIds.join(',')})`)
         }

         // 3. Pre-fetch: หา ID ของสถานที่ที่ชื่อตรงกับ "ห้องน้ำ..."
         const { data: locData } = await supabase
            .from('locations')
            .select('locations_id')
            .ilike('locations_name', `%${term}%`)
         
         const matchedLocIds = locData?.map(l => l.locations_id) || []
         if (matchedLocIds.length > 0) {
            orConditions.push(`locations_id.in.(${matchedLocIds.join(',')})`)
         }

         // 4. รวมร่างเงื่อนไข (ID งาน OR พนักงาน OR สถานที่)
         if (orConditions.length > 0) {
            query = query.or(orConditions.join(','))
         } else {
            // ถ้าหาไม่เจอสักอย่าง ให้คืนค่าว่าง (โดยการสั่งหา ID ที่ไม่มีจริง)
            query = query.eq('check_sessions_id', -1)
         }
      }

      const { data, count, error } = await query

      if (error) throw error

      tasks.value = data.map(item => {
        let mappedStatus = TASK_STATUS.WAITING
        const s = item.check_sessions_status
        if (TASK_STATUS.GROUP_APPROVED.includes(s)) mappedStatus = TASK_STATUS.APPROVED
        else if (TASK_STATUS.GROUP_REJECTED.includes(s)) mappedStatus = TASK_STATUS.REJECTED

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

  // Computed & Actions
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
    if (!userStore.profile?.employees_id) return

    const result = await Swal.fire({
      title: `ยืนยันการตรวจสอบ ${selectedIds.value.length} รายการ?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
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
        
        // Optimistic UI Update
        if (activeTab.value === TASK_STATUS.WAITING) {
            tasks.value = tasks.value.filter(t => !selectedIds.value.includes(t.id))
            if (tasks.value.length === 0 && currentPage.value > 1) {
                currentPage.value--
            }
            await fetchTasks(false) 
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

  watch([activeTab, startDate, endDate, selectedMaid], () => {
    currentPage.value = 1
    selectedIds.value = []
    fetchTasks()
  })

  watch(itemsPerPage, () => {
    currentPage.value = 1;
    fetchTasks();
  })

  // Debounce 800ms
  const onSearchChange = debounce(() => {
      currentPage.value = 1
      fetchTasks()
  }, 800)
  watch(searchQuery, onSearchChange)

  watch(isSelectionMode, (newVal) => {
    if (!newVal) {
      selectedIds.value = []
    }
  })

  onMounted(async () => {
    if (!userStore.profile) await userStore.fetchProfile()
    await fetchTasks()
    
    realtimeSubscription = supabase.channel('realtime_tasks')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'check_sessions' }, () => {
            fetchWaitingCount()
            fetchTasks(false) 
        }).subscribe()
  })

  onUnmounted(() => {
    if (realtimeSubscription) supabase.removeChannel(realtimeSubscription)
  })

  return {
    tasks, loading, activeTab, searchQuery, selectedMaid,
    dateRange, startDate, endDate, currentPage, itemsPerPage,
    isSelectionMode, selectedIds, isBulkSubmitting,
    uniqueMaids, filteredTasks, paginatedTasks, totalPages,
    startEntry, endEntry, waitingCount, isAllSelected,
    totalItemsCount,
    fetchTasks, changePage, toggleSelection, toggleSelectAll, handleBulkApprove
  }
}