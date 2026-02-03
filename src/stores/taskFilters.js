// src/stores/taskFilters.js
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useTaskFilterStore = defineStore('task-filters', () => {
  // --- State (เก็บค่าไว้ที่นี่ ไม่หายแน่นอน) ---
  const activeTab = ref('waiting')
  const searchQuery = ref('')
  const selectedMaid = ref('all')
  
  // ✅ dateRange: ตัวแปรสำคัญที่ทำให้ Dropdown วันที่จำค่าได้ (today, yesterday, month)
  const dateRange = ref('today') 

  const startDate = ref(new Date().toISOString().split('T')[0])
  const endDate = ref(new Date().toISOString().split('T')[0])
  
  // Pagination
  const currentPage = ref(1)
  const itemsPerPage = ref(100)

  // Selection
  const selectedIds = ref([])
  const isSelectionMode = ref(false)

  // --- Actions ---
  const resetFilters = () => {
    // ⚠️ ไม่ควร Reset 'activeTab' เพราะคนใช้งานอาจจะอยากล้างแค่ตัวกรองในหน้านั้นๆ
    // activeTab.value = 'waiting' 
    
    searchQuery.value = ''
    selectedMaid.value = 'all'
    
    // รีเซ็ตวันที่กลับเป็นวันนี้
    dateRange.value = 'today'
    startDate.value = new Date().toISOString().split('T')[0]
    endDate.value = new Date().toISOString().split('T')[0]
    
    // รีเซ็ตหน้าและ Selection
    currentPage.value = 1
    selectedIds.value = []
    isSelectionMode.value = false
  }

  return {
    activeTab,
    searchQuery,
    selectedMaid,
    dateRange, // ✅ ส่งออกไปใช้งาน
    startDate,
    endDate,
    currentPage,
    itemsPerPage,
    selectedIds,
    isSelectionMode,
    resetFilters
  }
})