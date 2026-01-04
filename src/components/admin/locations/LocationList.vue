<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Plus, Trash2, Edit, Building, Layers, MapPin, ChevronRight, Home, Users, MoreVertical } from 'lucide-vue-next'

const props = defineProps({
  rawLocations: { type: Array, default: () => [] },
  restroomTypes: { type: Array, default: () => [] },
  loading: Boolean,
  // 🔥 ตัวแปรสำคัญ: ถ้าเป็น true จะซ่อนปุ่มแก้ไขทั้งหมด
  readonly: { type: Boolean, default: false }
})

// เพิ่ม Event 'select' สำหรับตอนแม่บ้านเลือกห้อง
const emit = defineEmits(['add', 'edit', 'delete', 'edit-group', 'delete-group', 'select'])

// --- Navigation State ---
const viewLevel = ref(0)
const selectedBuilding = ref('')
const selectedFloor = ref('')
const selectedTypeId = ref('')

// --- Menu Dropdown State ---
const activeMenu = ref(null)

const closeMenu = () => activeMenu.value = null
const toggleMenu = (id) => {
  if (props.readonly) return // 🔒 Readonly: ห้ามเปิดเมนู
  if (activeMenu.value === id) activeMenu.value = null
  else activeMenu.value = id
}
onMounted(() => document.addEventListener('click', closeMenu))
onUnmounted(() => document.removeEventListener('click', closeMenu))

// --- Computed Logic ---
const uniqueBuildings = computed(() => {
  const buildings = props.rawLocations.map(l => l.locations_building).filter(Boolean)
  return [...new Set(buildings)].sort()
})

const uniqueFloors = computed(() => {
  if (!selectedBuilding.value) return []
  const floors = props.rawLocations
    .filter(l => l.locations_building === selectedBuilding.value)
    .map(l => l.locations_floor)
    .filter(f => f !== null && f !== undefined)

  return [...new Set(floors)].sort((a, b) => {
    return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
  })
})

const availableTypesInFloor = computed(() => {
  if (!selectedBuilding.value || !selectedFloor.value) return []
  const roomsInFloor = props.rawLocations.filter(l =>
    l.locations_building === selectedBuilding.value &&
    String(l.locations_floor) === String(selectedFloor.value)
  )
  const usedTypeIds = new Set(roomsInFloor.map(r => r.restroom_types_id))
  return props.restroomTypes.filter(t => usedTypeIds.has(t.restroom_types_id)).map(t => {
    return { ...t, count: roomsInFloor.filter(r => r.restroom_types_id === t.restroom_types_id).length }
  })
})

const currentRooms = computed(() => {
  if (!selectedBuilding.value || !selectedFloor.value || !selectedTypeId.value) return []
  return props.rawLocations.filter(l =>
    l.locations_building === selectedBuilding.value &&
    String(l.locations_floor) === String(selectedFloor.value) &&
    l.restroom_types_id == selectedTypeId.value
  )
})

const currentTypeName = computed(() => {
    const t = props.restroomTypes.find(type => type.restroom_types_id == selectedTypeId.value)
    return t ? t.restroom_types_name : 'ไม่ระบุ'
})

// --- Actions ---
const selectBuilding = (b) => {
  selectedBuilding.value = b
  selectedFloor.value = ''
  selectedTypeId.value = ''
  viewLevel.value = 1
}

const selectFloor = (f) => {
  selectedFloor.value = f
  selectedTypeId.value = ''
  viewLevel.value = 2
}

const selectType = (id) => {
  selectedTypeId.value = id
  viewLevel.value = 3
}

const resetView = () => {
  viewLevel.value = 0
  selectedBuilding.value = ''
  selectedFloor.value = ''
  selectedTypeId.value = ''
}

const handleAdd = (type) => {
  const contextData = { building: selectedBuilding.value, floor: selectedFloor.value, typeId: selectedTypeId.value }
  emit('add', { type, data: contextData })
}

const handleGroupAction = (action, level, oldVal) => {
  activeMenu.value = null
  if (action === 'edit') emit('edit-group', { level, oldVal })
  if (action === 'delete') emit('delete-group', { level, val: oldVal })
}
</script>

<template>
  <div class="animate-in fade-in slide-in-from-bottom-2">

    <div class="flex items-center gap-2 text-sm text-gray-500 mb-6 bg-gray-50 p-3 rounded-lg border border-gray-100 flex-wrap">
      <button @click="resetView" class="hover:text-indigo-600 flex items-center gap-1"><Home class="w-4 h-4" /> หน้าแรก</button>
      <template v-if="viewLevel >= 1">
        <ChevronRight class="w-4 h-4 text-gray-300" />
        <span :class="viewLevel === 1 ? 'font-bold text-gray-900' : 'hover:text-indigo-600 cursor-pointer'" @click="selectBuilding(selectedBuilding)">อาคาร {{ selectedBuilding }}</span>
      </template>
      <template v-if="viewLevel >= 2">
        <ChevronRight class="w-4 h-4 text-gray-300" />
        <span :class="viewLevel === 2 ? 'font-bold text-gray-900' : 'hover:text-indigo-600 cursor-pointer'" @click="selectFloor(selectedFloor)">ชั้น {{ selectedFloor }}</span>
      </template>
      <template v-if="viewLevel >= 3">
        <ChevronRight class="w-4 h-4 text-gray-300" />
        <span class="font-bold text-gray-900">{{ currentTypeName }}</span>
      </template>
    </div>

    <div v-if="viewLevel === 0">
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <div v-for="b in uniqueBuildings" :key="b"
                 class="relative bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all group text-center cursor-pointer"
                 @click="selectBuilding(b)"
            >
                <div v-if="!readonly" class="absolute top-2 right-2 z-10">
                    <button @click.stop="toggleMenu('building-' + b)" class="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors">
                        <MoreVertical class="w-4 h-4" />
                    </button>
                    <div v-if="activeMenu === 'building-' + b" class="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-xl border border-gray-100 z-20 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150">
                        <button @click.stop="handleGroupAction('edit', 'building', b)" class="w-full px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Edit class="w-3 h-3" /> แก้ไขชื่อ</button>
                        <button @click.stop="handleGroupAction('delete', 'building', b)" class="w-full px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 class="w-3 h-3" /> ลบอาคาร</button>
                    </div>
                </div>

                <div class="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform"><Building class="w-6 h-6" /></div>
                <h3 class="font-bold text-gray-900 text-lg truncate">{{ b }}</h3>
                <p class="text-xs text-gray-500 mt-1">คลิกเพื่อดูชั้น</p>
            </div>

            <button v-if="!readonly" @click="handleAdd('building')" class="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-gray-400 hover:text-indigo-600 hover:border-indigo-300 transition-all"><Plus class="w-8 h-8 mb-2" /><span class="text-sm font-medium">เพิ่มอาคาร</span></button>
        </div>
    </div>

    <div v-else-if="viewLevel === 1">
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <div v-for="f in uniqueFloors" :key="f"
                 class="relative bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all group text-center cursor-pointer"
                 @click="selectFloor(f)"
            >
                <div v-if="!readonly" class="absolute top-2 right-2 z-10">
                    <button @click.stop="toggleMenu('floor-' + f)" class="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
                        <MoreVertical class="w-4 h-4" />
                    </button>
                     <div v-if="activeMenu === 'floor-' + f" class="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-xl border border-gray-100 z-20 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150">
                        <button @click.stop="handleGroupAction('edit', 'floor', f)" class="w-full px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Edit class="w-3 h-3" /> แก้ไขชื่อ</button>
                        <button @click.stop="handleGroupAction('delete', 'floor', f)" class="w-full px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 class="w-3 h-3" /> ลบชั้น</button>
                    </div>
                </div>

                <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform"><Layers class="w-6 h-6" /></div>
                <h3 class="font-bold text-gray-900 text-lg">ชั้น {{ f }}</h3>
                <p class="text-xs text-gray-500 mt-1">คลิกเพื่อดูประเภท</p>
            </div>
            <button v-if="!readonly" @click="handleAdd('floor')" class="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-300 transition-all"><Plus class="w-8 h-8 mb-2" /><span class="text-sm font-medium">เพิ่มชั้น</span></button>
        </div>
    </div>

    <div v-else-if="viewLevel === 2">
       <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <div v-for="t in availableTypesInFloor" :key="t.restroom_types_id" @click="selectType(t.restroom_types_id)" class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-emerald-300 cursor-pointer transition-all group relative overflow-hidden flex flex-col h-full min-h-[180px]">
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

            <button v-if="!readonly" @click="handleAdd('room')" class="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-gray-400 hover:text-emerald-600 hover:border-emerald-300 transition-all h-full min-h-[180px]">
                <Plus class="w-8 h-8 mb-2" /><span class="text-sm font-medium">เพิ่มห้องใหม่</span>
            </button>
        </div>
    </div>

    <div v-else-if="viewLevel === 3">
       <div class="flex justify-between items-center mb-4">
            <h2 class="font-bold text-gray-800 flex items-center gap-2 text-lg"><MapPin class="w-5 h-5 text-indigo-500" /> {{ currentTypeName }}</h2>
            <button v-if="!readonly" @click="handleAdd('room')" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-indigo-700 shadow-sm"><Plus class="w-4 h-4" /> เพิ่มจุดตรวจ</button>
       </div>
       <div class="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
           <table class="min-w-full divide-y divide-gray-200">
               <thead class="bg-gray-50">
                   <tr>
                       <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-16">ID</th>
                       <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ชื่อจุดตรวจ / ห้อง</th>
                       <th v-if="!readonly" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">จัดการ</th>
                       <th v-else class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">เลือก</th>
                   </tr>
               </thead>
               <tbody class="bg-white divide-y divide-gray-200">
                   <tr v-if="currentRooms.length === 0"><td :colspan="readonly ? 3 : 3" class="px-6 py-10 text-center text-gray-400">ยังไม่มีข้อมูลจุดตรวจ</td></tr>
                   <tr v-for="room in currentRooms" :key="room.locations_id"
                       class="hover:bg-gray-50 transition-colors"
                       :class="{ 'cursor-pointer': readonly }"
                       @click="readonly ? $emit('select', room) : null"
                   >
                       <td class="px-6 py-4 text-sm text-gray-400">#{{ room.locations_id }}</td>
                       <td class="px-6 py-4 text-sm font-medium text-gray-900">{{ room.locations_name }}</td>

                       <td v-if="!readonly" class="px-6 py-4 text-right flex justify-end gap-2">
                           <button @click.stop="$emit('edit', room)" class="text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-colors"><Edit class="w-4 h-4" /></button>
                           <button @click.stop="$emit('delete', room.locations_id)" class="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 class="w-4 h-4" /></button>
                       </td>
                       <td v-else class="px-6 py-4 text-right text-indigo-600 font-bold text-sm">
                           เลือก >
                       </td>
                   </tr>
               </tbody>
           </table>
       </div>
    </div>

  </div>
</template>
