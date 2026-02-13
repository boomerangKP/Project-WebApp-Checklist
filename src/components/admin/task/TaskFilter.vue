<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from "vue";
import {
  Users,
  ChevronDown,
  ArrowRight,
  Check,
  Calendar as CalendarIcon,
  Search,
  X,
} from "lucide-vue-next";

// (คง Script เดิมไว้ทั้งหมด ไม่แตะต้อง Logic)
const props = defineProps({
  activeTab: String,
  searchQuery: String,
  selectedMaid: [String, Number],
  maids: { type: Array, default: () => [] },
  isSelectionMode: Boolean,
  isAllSelected: Boolean,
  waitingCount: Number,
  startDate: String,
  endDate: String,
  searchSuggestions: { type: Array, default: () => [] },
  dateRange: { type: String, default: "today" },
});

const emit = defineEmits([
  "update:activeTab",
  "update:searchQuery",
  "update:selectedMaid",
  "toggleSelectionMode",
  "toggleSelectAll",
  "refresh",
  "update:startDate",
  "update:endDate",
  "update:dateRange",
]);

// --- State ---
const activeDropdown = ref(null);
const showSearchSuggestions = ref(false);
const currentRange = ref(props.dateRange);

// Sync Props
watch(
  () => props.dateRange,
  (val) => {
    if (val) currentRange.value = val;
  }
);

// --- 📅 Logic ปฏิทิน ---
const customStart = ref(props.startDate || new Date().toISOString().slice(0, 10));
const customEnd = ref(props.endDate || new Date().toISOString().slice(0, 10));
const startInputRef = ref(null);
const endInputRef = ref(null);

const dateOptions = [
  { value: "today", label: "วันนี้" },
  { value: "yesterday", label: "เมื่อวาน" },
  { value: "week", label: "7 วันล่าสุด" },
  { value: "month", label: "เดือนนี้" },
  { value: "custom", label: "กำหนดเอง..." },
];

const currentDateLabel = computed(
  () => dateOptions.find((o) => o.value === currentRange.value)?.label || "เลือกช่วงเวลา"
);

// ✅ แก้ไข: ปรับรูปแบบวันที่เป็นแบบเต็ม (เช่น 13 ก.พ. 2569)
const displayThaiDate = (isoDate) => {
  if (!isoDate) return "-";
  const date = new Date(isoDate);
  return date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric", // เปลี่ยนจาก '2-digit' เป็น 'numeric'
  });
};

const openStartCalendar = () => startInputRef.value?.showPicker();
const openEndCalendar = () => endInputRef.value?.showPicker();

watch(currentRange, (newVal) => {
  emit("update:dateRange", newVal);
  if (newVal === "custom") return;

  const end = new Date();
  const start = new Date();
  if (newVal === "today") {
    /* วันนี้ */
  } else if (newVal === "yesterday") {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
  } else if (newVal === "week") {
    start.setDate(start.getDate() - 6);
  } else if (newVal === "month") {
    start.setDate(1);
  }

  emit("update:startDate", start.toISOString().slice(0, 10));
  emit("update:endDate", end.toISOString().slice(0, 10));
});

watch([customStart, customEnd], () => {
  if (currentRange.value === "custom") {
    emit("update:startDate", customStart.value);
    emit("update:endDate", customEnd.value);
  }
});

watch(
  () => props.startDate,
  (val) => {
    if (val) customStart.value = val;
  }
);
watch(
  () => props.endDate,
  (val) => {
    if (val) customEnd.value = val;
  }
);

// --- Logic Dropdown & Search ---
const toggleDropdown = (name) => {
  activeDropdown.value = activeDropdown.value === name ? null : name;
};
const closeDropdown = () => {
  activeDropdown.value = null;
};
const selectDateRange = (val) => {
  currentRange.value = val;
  closeDropdown();
};

const selectMaid = (val) => {
  emit("update:selectedMaid", val);
  closeDropdown();
};

const getMaidLabel = computed(() => {
    if (!props.selectedMaid || props.selectedMaid === 'all') return 'พนักงานทุกคน';
    const found = props.maids.find(m => m.id == props.selectedMaid);
    return found ? found.fullname : 'พนักงานทุกคน';
});

const filteredSearchList = computed(() => {
  if (!props.searchQuery) return [];
  const query = props.searchQuery.toLowerCase();
  return props.searchSuggestions
    .filter((item) => item && String(item).toLowerCase().includes(query))
    .slice(0, 10);
});

const selectSuggestion = (val) => {
  emit("update:searchQuery", val);
  showSearchSuggestions.value = false;
};

const highlightMatch = (text, query) => {
  if (!query || !text) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return String(text).replace(
    regex,
    '<span class="font-bold text-indigo-600 dark:text-indigo-400">$1</span>'
  );
};

const resetFilters = () => {
  currentRange.value = "today";
  emit("update:searchQuery", "");
  emit("update:selectedMaid", "all");
  if (props.isSelectionMode) {
    emit("toggleSelectionMode");
  }
};

const handleCustomSearch = () => {
  emit("refresh");
};

const hasFilters = computed(
  () =>
    props.searchQuery ||
    props.selectedMaid !== "all" ||
    currentRange.value !== "today" ||
    props.isSelectionMode
);

const handleClickOutside = (e) => {
  if (!e.target.closest(".custom-dropdown-container")) {
    activeDropdown.value = null;
    showSearchSuggestions.value = false;
  }
};

onMounted(() => window.addEventListener("click", handleClickOutside));
onUnmounted(() => window.removeEventListener("click", handleClickOutside));
</script>

<template>
  <div class="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col gap-4 transition-all duration-300">

    <div class="flex flex-wrap gap-4 items-end">

      <div class="w-full sm:flex-1 sm:min-w-[200px] flex flex-col gap-1.5 relative custom-dropdown-container">
        <label class="text-sm font-bold text-gray-600 dark:text-gray-300 flex items-center gap-2">
          <Search class="w-4 h-4" /> ค้นหารายการ
        </label>

        <div class="relative w-full">
            <input
              :value="searchQuery"
              @input="(e) => {
                  $emit('update:searchQuery', e.target.value);
                  showSearchSuggestions = true;
                }"
              @focus="showSearchSuggestions = true"
              type="text"
              placeholder="พิมพ์ชื่องาน, รหัส..."
              class="w-full px-3 py-2.5 pl-9 border border-gray-200 dark:border-slate-600 rounded-lg text-sm
                     focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
                     bg-white dark:bg-slate-900 text-gray-800 dark:text-white transition-all"
              autocomplete="off"
            />
            <Search class="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-slate-500 pointer-events-none" />

            <button
               v-if="searchQuery"
               @click="$emit('update:searchQuery', '')"
               class="absolute right-3 top-2.5 text-gray-400 hover:text-red-500 transition-colors"
            >
               <X class="w-4 h-4" />
            </button>
        </div>

        <div
            v-if="showSearchSuggestions && filteredSearchList.length > 0"
            class="absolute top-full left-0 mt-1 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95"
        >
            <div class="max-h-60 overflow-y-auto custom-scrollbar p-1">
                <div
                v-for="(item, index) in filteredSearchList"
                :key="index"
                @click="selectSuggestion(item)"
                class="px-3 py-2.5 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-sm cursor-pointer flex items-center gap-2 text-gray-700 dark:text-gray-200 transition-colors"
                >
                <Search class="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
                <span v-html="highlightMatch(item, searchQuery)"></span>
                </div>
            </div>
        </div>
      </div>

      <div class="w-full sm:w-auto sm:min-w-[180px] flex flex-col gap-1.5 relative custom-dropdown-container">
        <label class="text-sm font-bold text-gray-600 dark:text-gray-300 flex items-center gap-2">
          <CalendarIcon class="w-4 h-4" /> ช่วงเวลา
        </label>

        <button
            @click="toggleDropdown('date')"
            class="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900
                   text-sm text-left flex items-center justify-between hover:border-indigo-500 transition-all
                   focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            :class="{'ring-2 ring-indigo-500 border-indigo-500': activeDropdown === 'date'}"
        >
            <span class="text-gray-700 dark:text-gray-200 truncate">{{ currentDateLabel }}</span>
            <ChevronDown class="h-4 w-4 text-gray-400" />
        </button>

        <div
            v-if="activeDropdown === 'date'"
            class="absolute top-full left-0 mt-1 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-50 animate-in fade-in zoom-in-95 p-1"
        >
            <div
                v-for="option in dateOptions"
                :key="option.value"
                @click="selectDateRange(option.value)"
                class="px-3 py-2 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-sm cursor-pointer flex items-center justify-between text-gray-700 dark:text-gray-200 transition-colors"
            >
                <span>{{ option.label }}</span>
                <Check v-if="currentRange === option.value" class="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            </div>
        </div>
      </div>

      <div v-if="currentRange === 'custom'" class="w-full sm:w-auto flex flex-col sm:flex-row gap-2 sm:items-center animate-fade-in">
        <div class="flex flex-col gap-1.5 w-full sm:w-auto">
            <label class="text-xs font-bold text-gray-500 dark:text-gray-400">เริ่ม</label>
            <div class="relative group cursor-pointer w-full" @click="openStartCalendar">
                <div class="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg h-[42px] w-full">
                    <span class="text-sm text-gray-700 dark:text-gray-200 truncate">{{ displayThaiDate(customStart) }}</span>
                </div>
                <input
                    ref="startInputRef"
                    type="date"
                    v-model="customStart"
                    class="absolute inset-0 opacity-0 cursor-pointer w-full"
                />
            </div>
        </div>

        <div class="hidden sm:block pt-6 text-gray-400"><ArrowRight class="w-4 h-4" /></div>

        <div class="flex flex-col gap-1.5 w-full sm:w-auto">
            <label class="text-xs font-bold text-gray-500 dark:text-gray-400">ถึง</label>
            <div class="relative group cursor-pointer w-full" @click="openEndCalendar">
                 <div class="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg h-[42px] w-full">
                    <span class="text-sm text-gray-700 dark:text-gray-200 truncate">{{ displayThaiDate(customEnd) }}</span>
                </div>
                <input
                    ref="endInputRef"
                    type="date"
                    v-model="customEnd"
                    class="absolute inset-0 opacity-0 cursor-pointer w-full"
                />
            </div>
        </div>
      </div>

      <div class="w-full sm:w-auto sm:min-w-[200px] flex flex-col gap-1.5 relative custom-dropdown-container">
        <label class="text-sm font-bold text-gray-600 dark:text-gray-300 flex items-center gap-2">
          <Users class="w-4 h-4" /> พนักงาน
        </label>

        <button
            @click="toggleDropdown('maid')"
            class="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900
                   text-sm text-left flex items-center justify-between hover:border-indigo-500 transition-all
                   focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            :class="{'ring-2 ring-indigo-500 border-indigo-500': activeDropdown === 'maid'}"
        >
            <span class="text-gray-700 dark:text-gray-200 truncate">{{ getMaidLabel }}</span>
            <ChevronDown class="h-4 w-4 text-gray-400" />
        </button>

        <div
            v-if="activeDropdown === 'maid'"
            class="absolute top-full left-0 mt-1 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-50 animate-in fade-in zoom-in-95 max-h-60 overflow-y-auto custom-scrollbar p-1"
        >
            <div
                @click="selectMaid('all')"
                class="px-3 py-2 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-sm cursor-pointer flex items-center justify-between text-gray-700 dark:text-gray-200 transition-colors"
            >
                <span>พนักงานทุกคน</span>
                <Check v-if="selectedMaid === 'all'" class="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div
                v-for="maid in maids"
                :key="maid.id"
                @click="selectMaid(maid.id)"
                class="px-3 py-2 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-sm cursor-pointer flex items-center justify-between text-gray-700 dark:text-gray-200 transition-colors"
            >
                <span>{{ maid.fullname }}</span>
                <Check v-if="selectedMaid === maid.id" class="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            </div>
        </div>
      </div>

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
/* ✅ Dark Mode Scrollbar */
:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
  background: #475569;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-5px); }
    to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
    animation: fadeIn 0.2s ease-out forwards;
}
</style>
