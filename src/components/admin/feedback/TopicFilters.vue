<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import {
  Search,
  Filter,
  X,
  ChevronDown,
  Check,
  Activity,
  Ban,
  ListFilter,
} from "lucide-vue-next";

const props = defineProps({
  search: String,
  status: String, // 'all', 'active', 'inactive'
  // ✅ 1. เพิ่ม Prop รับข้อมูลสำหรับ Suggest
  searchSuggestions: { type: Array, default: () => [] },
});

const emit = defineEmits(["update:search", "update:status", "reset"]);

// --- State ---
const activeDropdown = ref(null);
const showSearchSuggestions = ref(false); // ✅ State คุมการโชว์ Suggestion

const toggleDropdown = (name) => {
  if (activeDropdown.value === name) {
    activeDropdown.value = null;
  } else {
    activeDropdown.value = name;
  }
};

const closeDropdown = () => {
  activeDropdown.value = null;
};

// --- Logic เลือกสถานะ ---
const selectStatus = (val) => {
  emit("update:status", val);
  closeDropdown();
};

// --- Logic กรอง Search Suggestion ---
const filteredSearchList = computed(() => {
  if (!props.search) return [];
  // กรองข้อมูลที่ตรงกับคำค้นหา (ตัดมาแค่ 10 อันแรก)
  return props.searchSuggestions
    .filter((item) => item.toLowerCase().includes(props.search.toLowerCase()))
    .slice(0, 10);
});

const selectSuggestion = (val) => {
  emit("update:search", val);
  showSearchSuggestions.value = false;
};

// --- Helper Click Outside ---
const handleClickOutside = (e) => {
  if (!e.target.closest(".custom-dropdown-container")) {
    activeDropdown.value = null;
    showSearchSuggestions.value = false; // ✅ ปิด suggestion ด้วย
  }
};

onMounted(() => window.addEventListener("click", handleClickOutside));
onUnmounted(() => window.removeEventListener("click", handleClickOutside));

// --- Helper แสดงชื่อสถานะปัจจุบัน ---
const currentStatusLabel = computed(() => {
  switch (props.status) {
    case "active":
      return "ใช้งานอยู่ (Active)";
    case "inactive":
      return "ปิดใช้งาน (Inactive)";
    default:
      return "สถานะทั้งหมด";
  }
});
</script>

<template>
  <div
    class="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col md:flex-row gap-2 md:gap-3 items-center flex-wrap transition-colors duration-300"
  >
    <div class="relative w-full md:flex-1 custom-dropdown-container">
      <Search
        class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
      />
      <input
        type="text"
        :value="search"
        @input="
          (e) => {
            $emit('update:search', e.target.value);
            showSearchSuggestions = true;
          }
        "
        @focus="showSearchSuggestions = true"
        placeholder="ค้นหาชื่อหัวข้อ หรือ คำอธิบาย..."
        class="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder-gray-400 dark:placeholder-slate-500"
        autocomplete="off"
      />

      <div
        v-if="showSearchSuggestions && filteredSearchList.length > 0"
        class="absolute top-full left-0 mt-1 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-[60] overflow-hidden animate-in fade-in zoom-in-95 duration-100"
      >
        <div class="max-h-60 overflow-y-auto p-1 custom-scrollbar">
          <div
            v-for="(item, index) in filteredSearchList"
            :key="index"
            @click="selectSuggestion(item)"
            class="px-3 py-2 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-sm cursor-pointer flex items-center gap-2 text-gray-700 dark:text-gray-200 group transition-colors"
          >
            <Search
              class="w-3 h-3 text-gray-400 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400"
            />
            <span
              class="truncate"
              v-html="
                item.replace(
                  new RegExp(`(${search})`, 'gi'),
                  '<span class=\'font-bold text-indigo-600 dark:text-indigo-400\'>$1</span>'
                )
              "
            ></span>
          </div>
        </div>
      </div>
    </div>

    <div class="h-6 w-px bg-gray-200 dark:bg-slate-700 hidden md:block"></div>

    <div class="relative custom-dropdown-container w-full md:w-auto">
      <div
        @click="toggleDropdown('status')"
        class="flex items-center gap-2 w-full md:w-56 px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg text-sm cursor-pointer hover:bg-white dark:hover:bg-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors"
        :class="{
          'ring-2 ring-indigo-500 border-indigo-500 bg-white dark:bg-slate-800':
            activeDropdown === 'status',
        }"
      >
        <Filter class="w-4 h-4 text-gray-400 dark:text-slate-500" />
        <span class="flex-1 truncate dark:text-white">{{ currentStatusLabel }}</span>
        <ChevronDown class="w-4 h-4 text-gray-400 dark:text-slate-500" />
      </div>

      <div
        v-if="activeDropdown === 'status'"
        class="absolute top-full right-0 mt-1 w-full md:w-56 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden"
      >
        <div class="p-1">
          <div
            @click="selectStatus('all')"
            class="px-3 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 text-sm cursor-pointer flex items-center gap-2 text-gray-700 dark:text-gray-200"
          >
            <ListFilter class="w-4 h-4 text-gray-400 dark:text-slate-500" />
            <span class="flex-1">สถานะทั้งหมด</span>
            <Check
              v-if="status === 'all' || !status"
              class="w-4 h-4 text-indigo-600 dark:text-indigo-400"
            />
          </div>

          <div class="h-px bg-gray-100 dark:bg-slate-700 my-1"></div>

          <div
            @click="selectStatus('active')"
            class="px-3 py-2 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-sm cursor-pointer flex items-center gap-2 text-gray-700 dark:text-gray-200 group"
          >
            <Activity class="w-4 h-4 text-emerald-500" />
            <span
              class="flex-1 group-hover:text-emerald-700 dark:group-hover:text-emerald-400"
              >ใช้งานอยู่ (Active)</span
            >
            <Check
              v-if="status === 'active'"
              class="w-4 h-4 text-emerald-600 dark:text-emerald-400"
            />
          </div>

          <div
            @click="selectStatus('inactive')"
            class="px-3 py-2 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-sm cursor-pointer flex items-center gap-2 text-gray-700 dark:text-gray-200 group"
          >
            <Ban class="w-4 h-4 text-red-400" />
            <span class="flex-1 group-hover:text-red-700 dark:group-hover:text-red-400"
              >ปิดใช้งาน (Inactive)</span
            >
            <Check
              v-if="status === 'inactive'"
              class="w-4 h-4 text-red-600 dark:text-red-400"
            />
          </div>
        </div>
      </div>
    </div>

    <div
      class="ml-auto text-xs text-gray-400 dark:text-slate-500 hidden md:block"
      v-if="search || (status && status !== 'all')"
    >
      <button
        @click="$emit('reset')"
        class="hover:text-red-500 dark:hover:text-red-400 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 whitespace-nowrap shrink-0"
        title="ล้างค่าค้นหา"
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
