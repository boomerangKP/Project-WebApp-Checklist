<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { Search, Building, Layers, X, ChevronDown, Check } from 'lucide-vue-next'

const props = defineProps({
  search: String,
  building: String,
  floor: String,
  uniqueBuildings: Array,
  uniqueFloors: Array,
  // รับข้อมูลสำหรับ Suggestion (ถ้ามี)
  searchSuggestions: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:search', 'update:building', 'update:floor', 'reset'])

// --- State ---
const activeDropdown = ref(null)
const showSearchSuggestions = ref(false)

const toggleDropdown = (name) => {
  if (activeDropdown.value === name) {
    activeDropdown.value = null
  } else {
    activeDropdown.value = name
  }
}

const closeDropdown = () => {
  activeDropdown.value = null
}

// --- Selection Logic ---
const selectBuilding = (val) => {
  emit('update:building', val)
  closeDropdown()
}

const selectFloor = (val) => {
  emit('update:floor', val)
  closeDropdown()
}

const selectSuggestion = (val) => {
  emit('update:search', val)
  showSearchSuggestions.value = false
}

// --- Filtering Logic (สำหรับ Search Suggestion อย่างเดียว) ---
const filteredSearchList = computed(() => {
  if (!props.search) return []
  return props.searchSuggestions.filter(item =>
    item.toLowerCase().includes(props.search.toLowerCase())
  ).slice(0, 10)
})

// --- Click Outside ---
const handleClickOutside = (e) => {
  if (!e.target.closest('.custom-dropdown-container')) {
    activeDropdown.value = null
    showSearchSuggestions.value = false
  }
}

onMounted(() => window.addEventListener('click', handleClickOutside))
onUnmounted(() => window.removeEventListener('click', handleClickOutside))
</script>

<template>
  <div class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-2 md:gap-3 items-center flex-wrap mb-6 transition-colors duration-300">

    <div class="relative w-full md:w-72 custom-dropdown-container">
      <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
      <input
        :value="search"
        @input="(e) => { $emit('update:search', e.target.value); showSearchSuggestions = true }"
        @focus="showSearchSuggestions = true"
        type="text"
        placeholder="ค้นหาชื่อ, รหัส..."
        class="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder-gray-400 dark:placeholder-slate-500"
        autocomplete="off"
      >

      <div v-if="showSearchSuggestions && filteredSearchList.length > 0"
           class="absolute top-full left-0 mt-1 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-[60] overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        <div class="max-h-60 overflow-y-auto p-1 custom-scrollbar">
          <div v-for="(item, index) in filteredSearchList" :key="index"
               @click="selectSuggestion(item)"
               class="px-3 py-2 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-sm cursor-pointer flex items-center gap-2 text-gray-700 dark:text-gray-200 group transition-colors">
             <Search class="w-3 h-3 text-gray-400 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400" />
             <span class="truncate" v-html="item.replace(new RegExp(`(${search})`, 'gi'), '<span class=\'font-bold text-indigo-600 dark:text-indigo-400\'>$1</span>')"></span>
          </div>
        </div>
      </div>
    </div>

    <div class="relative custom-dropdown-container w-full md:w-auto">
      <div
        @click="toggleDropdown('building')"
        class="flex items-center gap-2 w-full md:w-48 px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl text-sm cursor-pointer hover:bg-white dark:hover:bg-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors"
        :class="{'ring-2 ring-indigo-500 border-indigo-500 bg-white dark:bg-slate-800': activeDropdown === 'building'}"
      >
        <Building class="w-4 h-4 text-gray-400 dark:text-slate-500" />
        <span class="flex-1 truncate dark:text-white">{{ building || 'ทุกอาคาร' }}</span>
        <ChevronDown class="w-4 h-4 text-gray-400 dark:text-slate-500" />
      </div>

      <div v-if="activeDropdown === 'building'" class="absolute top-full left-0 mt-1 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
        <div class="max-h-48 overflow-y-auto p-1 custom-scrollbar">
          <div @click="selectBuilding('')" class="px-3 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 text-sm cursor-pointer text-gray-600 dark:text-gray-300 font-medium">
             ทุกอาคาร
          </div>
          <div v-for="b in uniqueBuildings" :key="b" @click="selectBuilding(b)"
               class="px-3 py-2 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-sm cursor-pointer flex items-center justify-between group">
             <span :class="building === b ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-gray-700 dark:text-gray-200'">{{ b }}</span>
             <Check v-if="building === b" class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>
      </div>
    </div>

    <div class="relative custom-dropdown-container w-full md:w-auto">
      <div
        @click="building ? toggleDropdown('floor') : null"
        class="flex items-center gap-2 w-full md:w-36 px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl text-sm transition-colors"
        :class="[
           !building ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-white dark:hover:bg-slate-800 hover:border-indigo-500',
           activeDropdown === 'floor' ? 'ring-2 ring-indigo-500 border-indigo-500 bg-white dark:bg-slate-800' : ''
        ]"
      >
        <Layers class="w-4 h-4 text-gray-400 dark:text-slate-500" />
        <span class="flex-1 truncate dark:text-white">{{ floor || (building ? 'ทุกชั้น' : 'เลือกอาคาร') }}</span>
        <ChevronDown class="w-4 h-4 text-gray-400 dark:text-slate-500" />
      </div>

      <div v-if="activeDropdown === 'floor'" class="absolute top-full left-0 mt-1 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
        <div class="max-h-48 overflow-y-auto p-1 custom-scrollbar">
          <div @click="selectFloor('')" class="px-3 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 text-sm cursor-pointer text-gray-600 dark:text-gray-300 font-medium">
             ทุกชั้น
          </div>
          <div v-for="f in uniqueFloors" :key="f" @click="selectFloor(f)"
               class="px-3 py-2 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-sm cursor-pointer flex items-center justify-between">
             <span :class="String(floor) === String(f) ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-gray-700 dark:text-gray-200'">{{ f }}</span>
             <Check v-if="String(floor) === String(f)" class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>
      </div>
    </div>

    <div class="ml-auto md:ml-0 text-xs text-gray-400" v-if="search || building || floor">
      <button
        @click="$emit('reset')"
        class="hover:text-red-500 dark:hover:text-red-400 flex items-center gap-1 transition-colors px-3 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-lg whitespace-nowrap shrink-0 text-red-600 dark:text-red-400 font-medium"
      >
        <X class="w-3 h-3" />
        <span class="hidden lg:inline">ล้างตัวกรอง</span>
      </button>
    </div>

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
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* ✅ Dark Mode Scrollbar */
:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
  background: #475569;
}
:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}
</style>