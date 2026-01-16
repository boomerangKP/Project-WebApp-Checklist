<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'
import QRCode from 'qrcode'
import { QrCode, Printer } from 'lucide-vue-next'
import Swal from 'sweetalert2'

// Import Components
import LocationFilter from '@/components/admin/qrcode/LocationFilter.vue'
import LocationTableQRCode from '@/components/admin/qrcode/LocationTableQRCode.vue'
import PrintPreviewModal from '@/components/admin/qrcode/PrintPreviewModal.vue'

// --- State ---
const loading = ref(true)
const locations = ref([])
const selectedIds = ref(new Set())
const showPreview = ref(false)
const qrDataUrls = ref({})
const isGenerating = ref(false)

// --- Filter State ---
const filters = ref({
  search: '',
  building: '',
  floor: ''
})

// --- Fetch Data ---
const fetchLocations = async () => {
  try {
    loading.value = true
    // ✅ แก้ไขตรงนี้: เพิ่ม restroom_types(restroom_types_name)
    const { data, error } = await supabase
      .from('locations')
      .select('*, restroom_types(restroom_types_name)') 
      .eq('locations_status', 'active')
      .order('locations_building')
      .order('locations_floor')

    if (error) throw error
    locations.value = data
  } catch (err) {
    console.error(err)
    Swal.fire('Error', 'ดึงข้อมูลไม่สำเร็จ', 'error')
  } finally {
    loading.value = false
  }
}

// --- Computed Logic ---
const uniqueBuildings = computed(() => [...new Set(locations.value.map(l => l.locations_building).filter(Boolean))].sort())

const uniqueFloors = computed(() => {
  if (!filters.value.building) return []
  const floors = locations.value.filter(l => l.locations_building === filters.value.building).map(l => l.locations_floor).filter(Boolean)
  return [...new Set(floors)].sort()
})

const filteredLocations = computed(() => {
  return locations.value.filter(l => {
    const matchSearch = !filters.value.search || l.locations_name.toLowerCase().includes(filters.value.search.toLowerCase()) || l.locations_code.toLowerCase().includes(filters.value.search.toLowerCase())
    const matchBuilding = !filters.value.building || l.locations_building === filters.value.building
    const matchFloor = !filters.value.floor || l.locations_floor === filters.value.floor
    return matchSearch && matchBuilding && matchFloor
  })
})

const selectedLocationsFull = computed(() => locations.value.filter(l => selectedIds.value.has(l.locations_id)))

// --- Actions ---
const handleResetFilter = () => filters.value = { search: '', building: '', floor: '' }

const toggleSelection = (id) => selectedIds.value.has(id) ? selectedIds.value.delete(id) : selectedIds.value.add(id)

const toggleSelectAll = () => {
  const visibleIds = filteredLocations.value.map(l => l.locations_id)
  const isAll = visibleIds.length > 0 && visibleIds.every(id => selectedIds.value.has(id))
  isAll ? visibleIds.forEach(id => selectedIds.value.delete(id)) : visibleIds.forEach(id => selectedIds.value.add(id))
}

const preparePrint = async () => {
  if (selectedIds.value.size === 0) return
  isGenerating.value = true
  showPreview.value = true
  qrDataUrls.value = {}

  // ✅ 1. ประกาศตัวแปร baseUrl ก่อน (ดึงค่า URL ของเว็บปัจจุบัน)
  const baseUrl = window.location.origin

  for (const loc of selectedLocationsFull.value) {
    try {
      // ✅ 2. เปลี่ยนการสร้าง Link:
      // - ใช้ baseUrl ที่ประกาศไว้ข้างบน
      // - เปลี่ยนจาก id เป็น token (เพื่อให้สแกนแล้วปลอดภัย เดาเลขไม่ได้)
      const qrContent = `${baseUrl}/scan/${loc.token}`

      qrDataUrls.value[loc.locations_id] = await QRCode.toDataURL(qrContent, {
        width: 400,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'H'
      })
    } catch (err) { console.error(err) }
  }
  isGenerating.value = false
}

const handlePrint = () => window.print()
onMounted(() => fetchLocations())
</script>

<template>
  <div class="h-[calc(100vh-9rem)] flex flex-col w-full">

    <div class="flex-none flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <QrCode class="w-7 h-7 text-indigo-600" /> พิมพ์ QR Code จุดตรวจ
        </h1>
        <p class="text-gray-500 text-sm mt-1">เลือกสถานที่ที่ต้องการพิมพ์สติ๊กเกอร์ QR Code</p>
      </div>

      <button
        @click="preparePrint"
        :disabled="selectedIds.size === 0"
        class="flex-none flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-sm transition-all active:scale-95 ml-auto"
      >
        <Printer class="w-5 h-5" /> <span>พิมพ์ ({{ selectedIds.size }})</span>
      </button>
    </div>

    <div class="flex-none ">
      <LocationFilter
        :search="filters.search"
        :building="filters.building"
        :floor="filters.floor"
        :uniqueBuildings="uniqueBuildings"
        :uniqueFloors="uniqueFloors"
        @update:search="filters.search = $event"
        @update:building="filters.building = $event; filters.floor = ''"
        @update:floor="filters.floor = $event"
        @reset="handleResetFilter"
      />
    </div>

    <div class="flex-1 min-h-0 relative overflow-hidden flex flex-col">
      <LocationTableQRCode
        class="h-full w-full"
        :locations="filteredLocations"
        :loading="loading"
        :selectedIds="selectedIds"
        @toggle="toggleSelection"
        @toggle-all="toggleSelectAll"
      />
    </div>

    <PrintPreviewModal
      :show="showPreview"
      :isGenerating="isGenerating"
      :selectedCount="selectedIds.size"
      :selectedLocations="selectedLocationsFull"
      :qrDataUrls="qrDataUrls"
      @close="showPreview = false"
      @confirm="handlePrint"
    />

  </div>
</template>