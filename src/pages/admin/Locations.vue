<script setup>
import { ref, computed, onMounted, onUnmounted, reactive } from 'vue'
import { supabase } from '@/lib/supabase'
import { 
  Plus, Trash2, Edit, Building, Layers, MapPin, 
  ChevronRight, Home, Users, MoreVertical, X, Loader2, Save 
} from 'lucide-vue-next'

// --- State: Data ---
const loading = ref(false)
const modalLoading = ref(false)
const rawLocations = ref([])
const restroomTypes = ref([])

// --- State: Navigation ---
const viewLevel = ref(0)
const selectedBuilding = ref('')
const selectedFloor = ref('')
const selectedTypeId = ref('')

// --- State: Dropdown Menu (ปุ่ม 3 จุด) ---
const activeMenu = ref(null)

// --- State: Modal ---
const isModalOpen = ref(false)
const modalTitle = ref('')
const currentMode = ref('') // 'add_building', 'add_floor', 'add_room', 'edit_room'
const editingId = ref(null)
const contextData = ref({}) // เก็บค่าตึก/ชั้นชั่วคราวตอนกดเพิ่ม

// --- Form Data ---
const formData = reactive({
  name: '' // ใช้ field เดียวพอ เพราะเราแยกโหมดชัดเจน (ชื่อตึก / ชั้น / ห้อง)
})

// --- Fetch Data ---
const fetchData = async () => {
  loading.value = true
  try {
    const [locsRes, typesRes] = await Promise.all([
       supabase.from('locations').select('*, restroom_types(*)').order('locations_building').order('locations_floor').order('locations_name'),
       supabase.from('restroom_types').select('*').eq('restroom_types_status', 'active')
    ])
    rawLocations.value = locsRes.data || []
    restroomTypes.value = typesRes.data || []
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

// --- Computed Logic (Navigation) ---
const uniqueBuildings = computed(() => {
  const buildings = rawLocations.value.map(l => l.locations_building)
  return [...new Set(buildings)].sort()
})

const uniqueFloors = computed(() => {
  if (!selectedBuilding.value) return []
  const floors = rawLocations.value
    .filter(l => l.locations_building === selectedBuilding.value)
    .map(l => l.locations_floor)
  return [...new Set(floors)].sort((a, b) => a - b)
})

const availableTypesInFloor = computed(() => {
  if (!selectedBuilding.value || !selectedFloor.value) return []
  const roomsInFloor = rawLocations.value.filter(l =>
    l.locations_building === selectedBuilding.value &&
    l.locations_floor === selectedFloor.value
  )
  const usedTypeIds = new Set(roomsInFloor.map(r => r.restroom_types_id))
  return restroomTypes.value.filter(t => usedTypeIds.has(t.restroom_types_id)).map(t => {
    return {
        ...t,
        count: roomsInFloor.filter(r => r.restroom_types_id === t.restroom_types_id).length
    }
  })
})

const currentRooms = computed(() => {
  if (!selectedBuilding.value || !selectedFloor.value || !selectedTypeId.value) return []
  return rawLocations.value.filter(l =>
    l.locations_building === selectedBuilding.value &&
    l.locations_floor === selectedFloor.value &&
    l.restroom_types_id === selectedTypeId.value
  )
})

const currentTypeName = computed(() => {
    const t = restroomTypes.value.find(type => type.restroom_types_id === selectedTypeId.value)
    return t ? t.restroom_types_name : 'ไม่ระบุ'
})

// --- Navigation Actions ---
const selectBuilding = (b) => { selectedBuilding.value = b; viewLevel.value = 1 }
const selectFloor = (f) => { selectedFloor.value = f; viewLevel.value = 2 }
const selectType = (id) => { selectedTypeId.value = id; viewLevel.value = 3 }
const resetView = () => { viewLevel.value = 0; selectedBuilding.value = ''; selectedFloor.value = ''; selectedTypeId.value = '' }

// --- Menu Actions ---
const closeMenu = () => activeMenu.value = null
const toggleMenu = (id) => {
  if (activeMenu.value === id) activeMenu.value = null
  else activeMenu.value = id
}
// ปิดเมนูเมื่อคลิกที่อื่น
onMounted(() => {
    fetchData()
    document.addEventListener('click', closeMenu)
})
onUnmounted(() => document.removeEventListener('click', closeMenu))

// --- Modal Actions ---
const openModal = (type, ctx = {}, editItem = null) => {
  contextData.value = ctx
  editingId.value = editItem ? editItem.locations_id : null
  formData.name = '' // Reset Form

  if (editItem) {
     currentMode.value = 'edit_room'
     modalTitle.value = 'แก้ไขชื่อจุดตรวจ'
     formData.name = editItem.locations_name
  } else {
      if (type === 'building') {
          currentMode.value = 'add_building'
          modalTitle.value = 'เพิ่มอาคารใหม่'
      } else if (type === 'floor') {
          currentMode.value = 'add_floor'
          modalTitle.value = `เพิ่มชั้นใหม่ (ในอาคาร ${selectedBuilding.value})`
      } else if (type === 'room') {
          currentMode.value = 'add_room'
          const typeName = restroomTypes.value.find(t => t.restroom_types_id === ctx.typeId)?.restroom_types_name || ''
          modalTitle.value = `เพิ่มห้องใหม่ (${typeName})`
      }
  }
  isModalOpen.value = true
}

const closeModal = () => isModalOpen.value = false

// --- Save Logic ---
const handleSave = async () => {
  if (!formData.name.trim()) return alert('กรุณากรอกข้อมูลให้ครบถ้วน')
  
  modalLoading.value = true
  try {
    // 1. เพิ่มตึก (สร้างห้อง Dummy)
    if (currentMode.value === 'add_building') {
        await supabase.from('locations').insert({
            locations_building: formData.name,
            locations_floor: '1', 
            restroom_types_id: restroomTypes.value[0]?.restroom_types_id,
            locations_name: 'จุดเริ่มต้น', 
            locations_status: 'active'
        })
    } 
    // 2. เพิ่มชั้น (สร้างห้อง Dummy)
    else if (currentMode.value === 'add_floor') {
        await supabase.from('locations').insert({
            locations_building: selectedBuilding.value,
            locations_floor: formData.name, 
            restroom_types_id: restroomTypes.value[0]?.restroom_types_id,
            locations_name: 'จุดเริ่มต้น', 
            locations_status: 'active'
        })
    } 
    // 3. เพิ่มห้องจริง
    else if (currentMode.value === 'add_room') {
        await supabase.from('locations').insert({
            locations_building: selectedBuilding.value, 
            locations_floor: selectedFloor.value,
            restroom_types_id: selectedTypeId.value, 
            locations_name: formData.name,
            locations_status: 'active'
        })
    } 
    // 4. แก้ไขชื่อห้อง
    else if (currentMode.value === 'edit_room') {
        await supabase.from('locations')
          .update({ locations_name: formData.name })
          .eq('locations_id', editingId.value)
    }

    closeModal()
    await fetchData()
  } catch (err) {
    alert('บันทึกไม่สำเร็จ: ' + err.message)
  } finally {
    modalLoading.value = false
  }
}

// --- Delete & Group Actions ---
const handleDeleteLocation = async (id) => {
  if (!confirm('⚠️ ยืนยันการลบจุดตรวจนี้?')) return
  try {
    loading.value = true
    await supabase.from('locations').delete().eq('locations_id', id)
    await fetchData()
  } catch (err) { alert(err.message) } finally { loading.value = false }
}

const handleGroupAction = async (action, level, oldVal) => {
  activeMenu.value = null // ปิดเมนู
  
  if (action === 'edit') {
    const newVal = prompt(`แก้ไขชื่อ${level === 'building' ? 'อาคาร' : 'ชั้น'} "${oldVal}" เป็น:`, oldVal)
    if (!newVal || newVal === oldVal) return
    try {
      loading.value = true
      const field = level === 'building' ? 'locations_building' : 'locations_floor'
      await supabase.from('locations').update({ [field]: newVal }).eq(field, oldVal)
      await fetchData()
    } catch (err) { alert(err.message) } finally { loading.value = false }
  }
  else if (action === 'delete') {
    if(!confirm(`⚠️ คำเตือน: คุณกำลังจะลบ "${oldVal}" และห้องทั้งหมดในกลุ่มนี้!\nยืนยันหรือไม่?`)) return
    try {
      loading.value = true
      const field = level === 'building' ? 'locations_building' : 'locations_floor'
      await supabase.from('locations').delete().eq(field, oldVal)
      await fetchData()
    } catch (err) { alert(err.message) } finally { loading.value = false }
  }
}
</script>

<template>
  <div class="space-y-6 pb-10">
    
    <div class="flex items-center gap-3">
       <MapPin class="w-8 h-8 text-indigo-600" />
       <div>
         <h1 class="text-2xl font-bold text-gray-900">จัดการสถานที่</h1>
         <p class="text-gray-500 text-sm">เพิ่ม ลบ แก้ไข ข้อมูลอาคาร ชั้น และจุดตรวจ</p>
       </div>
    </div>

    <div class="flex items-center gap-2 text-sm text-gray-500 bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex-wrap">
      <button @click="resetView" class="hover:text-indigo-600 flex items-center gap-1 font-medium transition-colors"><Home class="w-4 h-4" /> หน้าแรก</button>
      <template v-if="viewLevel >= 1"><ChevronRight class="w-4 h-4 text-gray-300" /><span :class="viewLevel === 1 ? 'font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md' : 'hover:text-indigo-600 cursor-pointer'" @click="viewLevel = 1">อาคาร {{ selectedBuilding }}</span></template>
      <template v-if="viewLevel >= 2"><ChevronRight class="w-4 h-4 text-gray-300" /><span :class="viewLevel === 2 ? 'font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md' : 'hover:text-indigo-600 cursor-pointer'" @click="viewLevel = 2">ชั้น {{ selectedFloor }}</span></template>
      <template v-if="viewLevel >= 3"><ChevronRight class="w-4 h-4 text-gray-300" /><span class="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{{ currentTypeName }}</span></template>
    </div>

    <div v-if="loading" class="text-center py-20 text-gray-400">
        <Loader2 class="w-8 h-8 animate-spin mx-auto mb-2" /> กำลังโหลดข้อมูล...
    </div>

    <div v-else>
        <div v-if="viewLevel === 0" class="animate-in fade-in slide-in-from-bottom-2">
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <div v-for="b in uniqueBuildings" :key="b" 
                    class="relative bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all group text-center cursor-pointer"
                    @click="selectBuilding(b)"
                >
                    <div class="absolute top-2 right-2 z-10">
                        <button @click.stop="toggleMenu(`building-${b}`)" class="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"><MoreVertical class="w-4 h-4" /></button>
                        <div v-if="activeMenu === `building-${b}`" class="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-xl border border-gray-100 z-20 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150">
                            <button @click.stop="handleGroupAction('edit', 'building', b)" class="w-full px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Edit class="w-3 h-3" /> แก้ไขชื่อ</button>
                            <button @click.stop="handleGroupAction('delete', 'building', b)" class="w-full px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 class="w-3 h-3" /> ลบอาคาร</button>
                        </div>
                    </div>
                    <div class="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform"><Building class="w-6 h-6" /></div>
                    <h3 class="font-bold text-gray-900 text-lg">อาคาร {{ b }}</h3>
                    <p class="text-xs text-gray-500 mt-1">คลิกเพื่อดูชั้น</p>
                </div>
                <button @click="openModal('building')" class="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-gray-400 hover:text-indigo-600 hover:border-indigo-300 transition-all active:scale-95"><Plus class="w-8 h-8 mb-2" /><span class="text-sm font-medium">เพิ่มอาคาร</span></button>
            </div>
        </div>

        <div v-else-if="viewLevel === 1" class="animate-in fade-in slide-in-from-bottom-2">
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <div v-for="f in uniqueFloors" :key="f" 
                    class="relative bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all group text-center cursor-pointer"
                    @click="selectFloor(f)"
                >
                    <div class="absolute top-2 right-2 z-10">
                        <button @click.stop="toggleMenu(`floor-${f}`)" class="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"><MoreVertical class="w-4 h-4" /></button>
                        <div v-if="activeMenu === `floor-${f}`" class="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-xl border border-gray-100 z-20 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150">
                            <button @click.stop="handleGroupAction('edit', 'floor', f)" class="w-full px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Edit class="w-3 h-3" /> แก้ไขชื่อ</button>
                            <button @click.stop="handleGroupAction('delete', 'floor', f)" class="w-full px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 class="w-3 h-3" /> ลบชั้น</button>
                        </div>
                    </div>
                    <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform"><Layers class="w-6 h-6" /></div>
                    <h3 class="font-bold text-gray-900 text-lg">ชั้น {{ f }}</h3>
                    <p class="text-xs text-gray-500 mt-1">คลิกเพื่อดูประเภท</p>
                </div>
                <button @click="openModal('floor')" class="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-300 transition-all active:scale-95"><Plus class="w-8 h-8 mb-2" /><span class="text-sm font-medium">เพิ่มชั้น</span></button>
            </div>
        </div>

        <div v-else-if="viewLevel === 2" class="animate-in fade-in slide-in-from-bottom-2">
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <div v-for="t in availableTypesInFloor" :key="t.restroom_types_id" @click="selectType(t.restroom_types_id)" class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-emerald-300 cursor-pointer transition-all group relative overflow-hidden flex flex-col h-full min-h-[160px]">
                    <div class="w-full flex justify-center mb-2">
                    <div class="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><Users class="w-6 h-6" /></div>
                    </div>
                    <div class="flex-1 flex items-center justify-center w-full px-1">
                    <h3 class="font-bold text-gray-900 text-sm text-center break-words w-full leading-snug">{{ t.restroom_types_name }}</h3>
                    </div>
                    <div class="w-full flex justify-center mt-3">
                    <span class="text-xs font-bold bg-gray-100 px-3 py-1 rounded-full text-gray-500">{{ t.count }} ห้อง</span>
                    </div>
                </div>
                <button @click="openModal('room', { typeId: availableTypesInFloor[0]?.restroom_types_id })" class="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-gray-400 hover:text-emerald-600 hover:border-emerald-300 transition-all h-full min-h-[160px]">
                    <Plus class="w-8 h-8 mb-2" /><span class="text-sm font-medium">เพิ่มห้องใหม่</span>
                </button>
            </div>
        </div>

        <div v-else-if="viewLevel === 3" class="animate-in fade-in slide-in-from-bottom-2">
            <div class="flex justify-end mb-4">
                <button @click="openModal('room', { typeId: selectedTypeId })" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-indigo-700 shadow-sm"><Plus class="w-4 h-4" /> เพิ่มจุดตรวจ</button>
            </div>
            <div class="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-16">ID</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ชื่อจุดตรวจ / ห้อง</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        <tr v-if="currentRooms.length === 0"><td colspan="3" class="px-6 py-10 text-center text-gray-400">ยังไม่มีข้อมูลจุดตรวจ</td></tr>
                        <tr v-for="room in currentRooms" :key="room.locations_id" class="hover:bg-gray-50 transition-colors">
                            <td class="px-6 py-4 text-sm text-gray-400">#{{ room.locations_id }}</td>
                            <td class="px-6 py-4 text-sm font-medium text-gray-900">{{ room.locations_name }}</td>
                            <td class="px-6 py-4 text-right flex justify-end gap-2">
                                <button @click="openModal('edit', {}, room)" class="text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-colors"><Edit class="w-4 h-4" /></button>
                                <button @click="handleDeleteLocation(room.locations_id)" class="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 class="w-4 h-4" /></button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 class="font-bold text-gray-800 text-lg">{{ modalTitle }}</h3>
          <button @click="closeModal" class="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded-full transition-colors"><X class="w-5 h-5" /></button>
        </div>

        <form @submit.prevent="handleSave" class="p-6 space-y-4">
          <div class="space-y-1.5">
            <label class="text-sm font-semibold text-gray-700">
               {{ currentMode === 'add_building' ? 'ชื่ออาคาร (เช่น A, B)' : 
                  currentMode === 'add_floor' ? 'เลขชั้น (เช่น 1, G)' : 'ชื่อห้อง/จุดตรวจ' }}
               <span class="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              v-model="formData.name" 
              class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
              :placeholder="currentMode === 'add_building' ? 'ระบุชื่ออาคาร...' : currentMode === 'add_floor' ? 'ระบุชั้น...' : 'เช่น ฝั่งซ้าย, ห้องที่ 1'"
              required
            />
          </div>

          <div class="pt-2 flex gap-3">
            <button type="button" @click="closeModal" class="flex-1 px-4 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium transition-colors">ยกเลิก</button>
            <button type="submit" :disabled="modalLoading" class="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors flex items-center justify-center gap-2">
              <Loader2 v-if="modalLoading" class="w-4 h-4 animate-spin" />
              <span>{{ modalLoading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล' }}</span>
            </button>
          </div>
        </form>

      </div>
    </div>

  </div>
</template>