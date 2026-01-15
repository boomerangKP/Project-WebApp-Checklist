<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { MapPin, Calendar, Clock, Search, ChevronDown, Check, Lock, AlertTriangle, Ban } from 'lucide-vue-next'
import { supabase } from '@/lib/supabase' // ✅ อย่าลืม import supabase

const props = defineProps({
  locations: { type: Array, default: () => [] },
  restroomTypes: { type: Array, default: () => [] },
  selectedLocation: [String, Number],
  selectedType: [String, Number],
  currentDate: String,
  currentTime: String,
  disabledType: { type: Boolean, default: false },
  disabledLocation: { type: Boolean, default: false }
})

const emit = defineEmits(['update:selectedLocation', 'update:selectedType', 'refresh-locations']) // ✅ เพิ่ม emit refresh

const searchQuery = ref('')
const isDropdownOpen = ref(false)
const dropdownRef = ref(null)

// --- 1. ปรับ Logic การกรอง: ไม่ซ่อนห้องที่ปิด แต่แสดงทั้งหมด ---
const filteredLocations = computed(() => {
  // ดึงมาทั้งหมด (ไม่ filter status ที่แม่ส่งมาแล้ว)
  let items = props.locations

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    items = items.filter(loc =>
      loc.locations_name.toLowerCase().includes(query) ||
      loc.locations_building.toLowerCase().includes(query)
    )
  }
  return items
})

// --- 2. ฟังก์ชันเลือกห้อง (แก้ให้เลือกไม่ได้ถ้าห้องปิด) ---
const selectLocation = (loc) => {
  // 🛑 เช็คสถานะก่อน ถ้าไม่ใช่ active ห้ามเลือก
  if (loc.locations_status !== 'active') return

  searchQuery.value = loc.locations_name
  emit('update:selectedLocation', loc.locations_id)
  isDropdownOpen.value = false
}

// Watcher เพื่ออัปเดตชื่อในช่องค้นหาตาม ID ที่ส่งมา (ถ้าห้องโดนปิดและถูกเลือกอยู่ ให้เคลียร์ทิ้ง)
watch(() => props.selectedLocation, (newVal) => {
  const found = props.locations.find(l => l.locations_id == newVal)
  if (found) {
    // ถ้าห้องที่เลือกอยู่ๆ โดนเปลี่ยนสถานะเป็น inactive/maintenance ให้แจ้งเตือนหรือเคลียร์ค่า
    if (found.locations_status !== 'active' && !props.disabledLocation) {
       searchQuery.value = '' // เคลียร์ชื่อออกเพื่อให้รู้ว่าหลุด
       emit('update:selectedLocation', '') // ยกเลิกการเลือก
    } else {
       searchQuery.value = found.locations_name
    }
  } else if (!newVal) {
    searchQuery.value = ''
  }
}, { immediate: true, deep: true }) // Deep watch เผื่อ object เปลี่ยน

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

// --- 3. Real-time Subscription (ฟังการเปลี่ยนแปลงทันที) ---
let subscription = null

onMounted(() => {
  document.addEventListener('click', handleClickOutside)

  // 📡 ฟังการเปลี่ยนแปลงที่ตาราง locations
  subscription = supabase
    .channel('locations_updates')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'locations' },
      (payload) => {
        // console.log('Location updated:', payload)
        // สั่งให้ Component แม่โหลดข้อมูลใหม่ทันที
        emit('refresh-locations')
      }
    )
    .subscribe()
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  if (subscription) supabase.removeChannel(subscription)
})

// Helper: สีสถานะ
const getStatusBadge = (status) => {
  switch(status) {
    case 'maintenance': return { text: 'ปิดปรับปรุง', class: 'bg-orange-100 text-orange-600', icon: AlertTriangle }
    case 'inactive': return { text: 'ปิดใช้งาน', class: 'bg-gray-100 text-gray-500', icon: Ban }
    default: return null
  }
}
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
          @focus="!disabledLocation && (isDropdownOpen = true)"
          @input="!disabledLocation && (isDropdownOpen = true); !disabledLocation && emit('update:selectedLocation', '')"
          :disabled="disabledLocation"
          placeholder="พิมพ์ชื่อห้อง หรือ ชั้น... (เช่น 101)"
          class="w-full border text-gray-800 py-3 pl-10 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors placeholder:text-gray-400"
          :class="disabledLocation ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-50 border-gray-200'"
        />

        <Search class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />

        <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
           <Lock v-if="disabledLocation" class="w-4 h-4 text-gray-400" />
           <ChevronDown v-else class="w-5 h-5 text-gray-400 transition-transform" :class="{ 'rotate-180': isDropdownOpen }" />
        </div>

        <div v-if="isDropdownOpen && !disabledLocation" class="absolute z-20 mt-1 w-full bg-white rounded-xl shadow-xl border border-gray-100 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
          <ul v-if="filteredLocations.length > 0">
            <li
              v-for="loc in filteredLocations"
              :key="loc.locations_id"
              @click="selectLocation(loc)"
              class="px-4 py-3 border-b border-gray-50 last:border-0 flex justify-between items-center group transition-colors"
              :class="{
                'hover:bg-indigo-50 cursor-pointer': loc.locations_status === 'active',
                'bg-gray-50 cursor-not-allowed opacity-75': loc.locations_status !== 'active'
              }"
            >
              <div>
                <div class="flex items-center gap-2">
                   <span class="font-medium" :class="loc.locations_status === 'active' ? 'text-gray-800 group-hover:text-indigo-700' : 'text-gray-400 line-through'">
                      {{ loc.locations_name }}
                   </span>

                   <span v-if="loc.locations_status !== 'active'" class="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1" :class="getStatusBadge(loc.locations_status).class">
                      <component :is="getStatusBadge(loc.locations_status).icon" class="w-3 h-3" />
                      {{ getStatusBadge(loc.locations_status).text }}
                   </span>
                </div>
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
      <p v-if="disabledType || disabledLocation" class="text-xs text-indigo-500 flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1">
         <Lock class="w-3 h-3" /> ระบบระบุข้อมูลให้อัตโนมัติตาม QR Code
      </p>
    </div>

    <div class="pt-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500 bg-gray-50/50 -mx-5 -mb-5 p-4 rounded-b-2xl mt-2">
      <div class="flex items-center gap-1.5"><Calendar class="w-4 h-4" /> {{ currentDate }}</div>
      <div class="flex items-center gap-1.5"><Clock class="w-4 h-4" /> {{ currentTime }}</div>
    </div>
  </div>
</template>
