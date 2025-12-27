<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { MapPin, Calendar, Clock, Search, ChevronDown, Check, Lock } from 'lucide-vue-next' // ✅ เพิ่ม Lock

const props = defineProps({
  locations: {
    type: Array,
    default: () => []
  },
  restroomTypes: {
    type: Array,
    default: () => []
  },
  selectedLocation: [String, Number],
  selectedType: [String, Number],
  currentDate: String,
  currentTime: String,

  // 🔥 ตัวแปรสั่งล็อก (รับค่ามาจากแม่)
  disabledType: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:selectedLocation', 'update:selectedType'])

// --- Search Logic (เหมือนเดิม) ---
const searchQuery = ref('')
const isDropdownOpen = ref(false)
const dropdownRef = ref(null)

const filteredLocations = computed(() => {
  if (!searchQuery.value) return props.locations
  const query = searchQuery.value.toLowerCase()
  return props.locations.filter(loc =>
    loc.locations_name.toLowerCase().includes(query) ||
    loc.locations_building.toLowerCase().includes(query)
  )
})

const selectLocation = (loc) => {
  searchQuery.value = loc.locations_name
  emit('update:selectedLocation', loc.locations_id)
  isDropdownOpen.value = false
}

watch(() => props.selectedLocation, (newVal) => {
  const found = props.locations.find(l => l.locations_id == newVal)
  if (found) {
    searchQuery.value = found.locations_name
  } else if (!newVal) {
    searchQuery.value = ''
  }
}, { immediate: true })

const handleClickOutside = (event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    isDropdownOpen.value = false
    if (!props.selectedLocation) {
        searchQuery.value = ''
    } else {
        const found = props.locations.find(l => l.locations_id == props.selectedLocation)
        if (found) searchQuery.value = found.locations_name
    }
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>

<template>
  <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-5">

    <h2 class="font-bold text-gray-800 flex items-center gap-2 text-lg">
      <MapPin class="w-5 h-5 text-indigo-500" />
      ระบุข้อมูลงาน
    </h2>

    <div class="space-y-1.5" ref="dropdownRef">
      <label class="text-sm font-medium text-gray-700">สถานที่ปฏิบัติงาน</label>
      <div class="relative">
        <input
          type="text"
          v-model="searchQuery"
          @focus="isDropdownOpen = true"
          @input="isDropdownOpen = true; emit('update:selectedLocation', '')"
          placeholder="พิมพ์ชื่อห้อง หรือ ชั้น... (เช่น 101)"
          class="w-full bg-gray-50 border border-gray-200 text-gray-800 py-3 pl-10 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors placeholder:text-gray-400"
        />
        <Search class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <ChevronDown class="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-transform"
          :class="{ 'rotate-180': isDropdownOpen }"
        />

        <div v-if="isDropdownOpen" class="absolute z-20 mt-1 w-full bg-white rounded-xl shadow-xl border border-gray-100 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
          <ul v-if="filteredLocations.length > 0">
            <li v-for="loc in filteredLocations" :key="loc.locations_id" @click="selectLocation(loc)" class="px-4 py-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-50 last:border-0 flex justify-between items-center group">
              <div>
                <div class="font-medium text-gray-800 group-hover:text-indigo-700">{{ loc.locations_name }}</div>
                <div class="text-xs text-gray-500">อาคาร {{ loc.locations_building }} • ชั้น {{ loc.locations_floor }}</div>
              </div>
              <Check v-if="selectedLocation === loc.locations_id" class="w-4 h-4 text-indigo-600" />
            </li>
          </ul>
          <div v-else class="p-4 text-center text-gray-400 text-sm">ไม่พบสถานที่ที่ค้นหา</div>
        </div>
      </div>
    </div>

    <div class="space-y-1.5">
      <label class="text-sm font-medium text-gray-700">ประเภทห้องน้ำ</label>
      <div class="relative">
        <select
          :value="selectedType"
          @change="$emit('update:selectedType', $event.target.value)"
          :disabled="disabledType"
          class="w-full appearance-none border text-gray-800 py-3 px-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors cursor-pointer"
          :class="disabledType ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed' : 'bg-gray-50 border-gray-200'"
        >
          <option value="" disabled>-- กรุณาเลือกประเภท --</option>
          <option v-for="type in restroomTypes" :key="type.restroom_types_id" :value="type.restroom_types_id">
            {{ type.restroom_types_name }}
          </option>
        </select>

        <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
          <Lock v-if="disabledType" class="w-4 h-4 text-gray-400" />
          <ChevronDown v-else class="w-5 h-5" />
        </div>
      </div>

      <p v-if="disabledType" class="text-xs text-indigo-500 flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1">
         <Lock class="w-3 h-3" /> ระบบเลือกประเภทให้อัตโนมัติตามสถานที่
      </p>
    </div>

    <div class="pt-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500 bg-gray-50/50 -mx-5 -mb-5 p-4 rounded-b-2xl mt-2">
      <div class="flex items-center gap-1.5"><Calendar class="w-4 h-4" /> {{ currentDate }}</div>
      <div class="flex items-center gap-1.5"><Clock class="w-4 h-4" /> {{ currentTime }}</div>
    </div>
  </div>
</template>
