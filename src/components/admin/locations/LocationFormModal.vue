<script setup>
import { reactive, watch, ref, computed } from 'vue'
import { MapPin, Hash, X, Loader2, ChevronDown, Check, Plus } from 'lucide-vue-next'

const props = defineProps({
  isOpen: Boolean,
  mode: String,
  initialData: Object,
  restroomTypes: Array,
  uniqueBuildings: Array,
  floorsByBuilding: Array,
  loading: Boolean
})

const emit = defineEmits(['close', 'save', 'update:building'])

const formData = reactive({
  id: null,
  code: '',
  name: '',
  building: '',
  floor: '',
  typeId: '',
  status: 'active'
})

// --- State สำหรับ Custom Dropdown ---
const showBuildingDropdown = ref(false)
const showFloorDropdown = ref(false)
const buildingSearch = ref('')
const floorSearch = ref('')

// Initialize Form
watch(() => props.isOpen, (val) => {
  if (val) {
    if (props.mode === 'edit' && props.initialData) {
      const item = props.initialData
      Object.assign(formData, {
        id: item.locations_id,
        code: item.locations_code,
        name: item.locations_name,
        building: item.locations_building,
        floor: item.locations_floor,
        typeId: item.restroom_types_id,
        status: item.locations_status || 'active' // Load status
      })
    } else {
      Object.assign(formData, {
        id: null,
        code: '',
        name: '',
        building: '',
        floor: '',
        typeId: props.restroomTypes[0]?.restroom_types_id || '',
        status: 'active'
      })
    }
    // Reset Search
    buildingSearch.value = ''
    floorSearch.value = ''
  }
})

// Watch Building Change
watch(() => formData.building, (val) => {
  emit('update:building', val)
})

// --- Filtered Options ---
const filteredBuildings = computed(() => {
  const q = buildingSearch.value.toLowerCase()
  return props.uniqueBuildings.filter(b => b.toLowerCase().includes(q))
})

const filteredFloors = computed(() => {
  const q = floorSearch.value.toLowerCase()
  return props.floorsByBuilding.filter(f => String(f).toLowerCase().includes(q))
})

// --- Actions ---
const selectBuilding = (b) => {
  formData.building = b
  showBuildingDropdown.value = false
  buildingSearch.value = ''
  formData.floor = ''
}

const createBuilding = () => {
  if(!buildingSearch.value.trim()) return
  formData.building = buildingSearch.value.trim()
  showBuildingDropdown.value = false
}

const selectFloor = (f) => {
  formData.floor = f
  showFloorDropdown.value = false
  floorSearch.value = ''
}

const createFloor = () => {
   if(!floorSearch.value.trim()) return
  formData.floor = floorSearch.value.trim()
  showFloorDropdown.value = false
}

const handleSubmit = () => {
  emit('save', { ...formData })
}

// Helper แสดงข้อความสถานะ
const getStatusLabel = (status) => {
  switch(status) {
    case 'active': return 'กำลังเปิดใช้งาน (Active)'
    case 'maintenance': return 'กำลังปิดปรับปรุง (Maintenance)'
    case 'inactive': return 'ปิดการใช้งานถาวร (Inactive)'
    default: return status
  }
}

// Helper สีข้อความสถานะ
const getStatusColor = (status) => {
  switch(status) {
    case 'active': return 'text-emerald-600'
    case 'maintenance': return 'text-orange-600'
    case 'inactive': return 'text-gray-500'
    default: return 'text-gray-500'
  }
}
</script>

<template>
  <div>
    <Teleport to="body">

      <div v-if="isOpen" class="fixed inset-0 z-[9999] flex items-center justify-center p-4">

        <div
          class="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          @click="$emit('close')"
        ></div>

        <div class="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-visible animate-in zoom-in-95 relative z-10">

          <div v-if="showBuildingDropdown || showFloorDropdown" @click="showBuildingDropdown = false; showFloorDropdown = false" class="fixed inset-0 z-[60] bg-transparent"></div>

          <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
            <h3 class="font-bold text-gray-800 text-lg flex items-center gap-2">
              <MapPin class="w-5 h-5 text-indigo-600" />
              {{ mode === 'add' ? 'เพิ่มจุดตรวจใหม่' : 'แก้ไขข้อมูล' }}
            </h3>
            <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded-full"><X class="w-5 h-5" /></button>
          </div>

          <form @submit.prevent="handleSubmit" class="p-6 space-y-5">

            <div class="grid grid-cols-2 gap-4">
               <div class="space-y-1">
                 <label class="text-xs font-bold text-gray-500 uppercase">รหัส (Code) <span class="text-red-500">*</span></label>
                 <div class="relative">
                   <Hash class="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                   <input v-model="formData.code" type="text" placeholder="Ex. B1-F2-01" class="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono" required>
                 </div>
               </div>
               <div class="space-y-1">
                 <label class="text-xs font-bold text-gray-500 uppercase">ประเภทห้อง <span class="text-red-500">*</span></label>
                 <div class="relative">
                    <select v-model="formData.typeId" class="w-full pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none appearance-none" required>
                      <option v-for="t in restroomTypes" :key="t.restroom_types_id" :value="t.restroom_types_id">{{ t.restroom_types_name }}</option>
                    </select>
                    <ChevronDown class="w-4 h-4 absolute right-3 top-2.5 text-gray-400 pointer-events-none"/>
                 </div>
               </div>
            </div>

            <div class="grid grid-cols-2 gap-4">

               <div class="space-y-1 relative">
                 <label class="text-xs font-bold text-gray-500 uppercase">อาคาร <span class="text-red-500">*</span></label>
                 <div
                   @click="showBuildingDropdown = !showBuildingDropdown; showFloorDropdown = false"
                   class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm flex items-center justify-between cursor-pointer hover:bg-white hover:border-emerald-500 transition-colors"
                   :class="{'ring-2 ring-emerald-500 border-emerald-500 bg-white': showBuildingDropdown}"
                 >
                    <span :class="formData.building ? 'text-gray-900' : 'text-gray-400'">
                      {{ formData.building || 'เลือกอาคาร...' }}
                    </span>
                    <ChevronDown class="w-4 h-4 text-gray-400" />
                 </div>

                 <div v-if="showBuildingDropdown" class="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-[70] overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div class="p-2 border-b border-gray-100">
                       <input v-model="buildingSearch" ref="buildingInput" type="text" placeholder="พิมพ์เพื่อค้นหา/สร้าง..." class="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" @click.stop>
                    </div>
                    <div class="max-h-48 overflow-y-auto p-1 custom-scrollbar">
                       <div v-for="b in filteredBuildings" :key="b" @click="selectBuilding(b)" class="px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer flex items-center justify-between group">
                          <span>{{ b }}</span>
                          <Check v-if="formData.building === b" class="w-4 h-4 text-emerald-600" />
                       </div>
                       <div v-if="filteredBuildings.length === 0 && buildingSearch" @click="createBuilding" class="px-3 py-2 rounded-lg text-sm text-emerald-600 bg-emerald-50 cursor-pointer flex items-center gap-2">
                          <Plus class="w-4 h-4" /> สร้าง "{{ buildingSearch }}"
                       </div>
                       <div v-if="filteredBuildings.length === 0 && !buildingSearch" class="px-3 py-2 text-xs text-gray-400 text-center">ไม่พบข้อมูล</div>
                    </div>
                 </div>
               </div>

               <div class="space-y-1 relative">
                 <label class="text-xs font-bold text-gray-500 uppercase">ชั้น <span class="text-red-500">*</span></label>
                 <div
                   @click="formData.building ? (showFloorDropdown = !showFloorDropdown, showBuildingDropdown = false) : null"
                   class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm flex items-center justify-between cursor-pointer transition-colors"
                   :class="{
                     'opacity-50 cursor-not-allowed': !formData.building,
                     'hover:bg-white hover:border-emerald-500': formData.building,
                     'ring-2 ring-emerald-500 border-emerald-500 bg-white': showFloorDropdown
                   }"
                 >
                    <span :class="formData.floor ? 'text-gray-900' : 'text-gray-400'">
                      {{ formData.floor || 'เลือกชั้น...' }}
                    </span>
                    <ChevronDown class="w-4 h-4 text-gray-400" />
                 </div>

                 <div v-if="showFloorDropdown" class="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-[70] overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div class="p-2 border-b border-gray-100">
                       <input v-model="floorSearch" type="text" placeholder="ค้นหาชั้น..." class="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" @click.stop>
                    </div>
                    <div class="max-h-48 overflow-y-auto p-1 custom-scrollbar">
                       <div v-for="f in filteredFloors" :key="f" @click="selectFloor(f)" class="px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer flex items-center justify-between">
                          <span>ชั้น {{ f }}</span>
                          <Check v-if="String(formData.floor) === String(f)" class="w-4 h-4 text-emerald-600" />
                       </div>
                        <div v-if="filteredFloors.length === 0 && floorSearch" @click="createFloor" class="px-3 py-2 rounded-lg text-sm text-emerald-600 bg-emerald-50 cursor-pointer flex items-center gap-2">
                          <Plus class="w-4 h-4" /> เพิ่ม "ชั้น {{ floorSearch }}"
                       </div>
                    </div>
                 </div>
               </div>

            </div>

            <div class="space-y-1">
               <label class="text-xs font-bold text-gray-500 uppercase">ชื่อจุดตรวจ / ห้อง <span class="text-red-500">*</span></label>
               <input v-model="formData.name" type="text" placeholder="ระบุชื่อเรียก (เช่น ห้องน้ำชาย ฝั่งซ้าย)" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" required>
            </div>

            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div class="flex flex-col">
                 <span class="text-sm font-bold text-gray-900">สถานะการใช้งาน</span>
                 <span class="text-xs transition-colors" :class="getStatusColor(formData.status)">
                   {{ getStatusLabel(formData.status) }}
                 </span>
              </div>

              <div class="relative w-40">
                <select
                  v-model="formData.status"
                  class="w-full pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none appearance-none cursor-pointer hover:border-emerald-500 transition-colors"
                >
                  <option value="active">🟢 ปกติ</option>
                  <option value="maintenance">🟠 ปิดปรับปรุง</option>
                  <option value="inactive">🔴 ปิดใช้งาน</option>
                </select>
                <ChevronDown class="w-4 h-4 absolute right-3 top-2.5 text-gray-500 pointer-events-none"/>
              </div>
            </div>

            <div class="pt-4 flex gap-3 border-t border-gray-100 mt-4">
              <button type="button" @click="$emit('close')" class="flex-1 py-2.5 text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-medium transition-colors">ยกเลิก</button>
              <button type="submit" :disabled="loading" class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 transition-all active:scale-95">
                <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
                <span>{{ loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล' }}</span>
              </button>
            </div>

          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
</style>
