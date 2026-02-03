<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from "vue";
import {
  ListFilter,
  RotateCcw,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  X,
  ChevronDown,
  ArrowRight,
  Check,
  Calendar as CalendarIcon,
  Search,
  CheckSquare,
  Square,
} from "lucide-vue-next";
import { TASK_STATUS } from '@/constants/status';

const props = defineProps({
  activeTab: String,
  searchQuery: String,
  selectedMaid: [String, Number], // ✅ รองรับทั้ง ID (Number) และ 'all' (String)
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

const displayThaiDate = (isoDate) => {
  if (!isoDate) return "-";
  const date = new Date(isoDate);
  return date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
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

// ✅ Helper: หาชื่อจาก ID (ปรับให้รองรับทั้ง String/Number กันเหนียว)
const getMaidLabel = computed(() => {
    if (!props.selectedMaid || props.selectedMaid === 'all') return 'พนักงานทุกคน';
    // ใช้ == (Loose Equality) เพื่อให้ "1" (String) เท่ากับ 1 (Number)
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
  <div class="flex flex-col rounded-xl border border-gray-200 bg-white dark:bg-slate-800 dark:border-slate-700 shadow-sm">
    <div
      class="flex flex-col md:flex-row md:items-center justify-between gap-3  p-2  transition-colors duration-300 "
    >
      <div
        class="flex overflow-x-auto custom-scrollbar gap-2 flex-1 min-w-0 items-center pb-1 md:pb-0"
      >
        <button
          v-for="tab in [
            { id: TASK_STATUS.WAITING, label: 'รอตรวจสอบ', icon: Clock },
            { id: TASK_STATUS.APPROVED, label: 'ตรวจแล้ว', icon: CheckCircle2 },
            { id: TASK_STATUS.REJECTED, label: 'แก้ไข', icon: XCircle },
            { id: 'all', label: 'ทั้งหมด', icon: ListFilter },
          ]"
          :key="tab.id"
          @click="$emit('update:activeTab', tab.id)"
          class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap border shrink-0"
          :class="
            activeTab === tab.id
              ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 shadow-sm'
              : 'bg-white dark:bg-slate-800 border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
          "
        >
          <component :is="tab.icon" class="w-4 h-4" />
          <span>{{ tab.label }}</span>
          <span
            v-if="tab.id === TASK_STATUS.WAITING && waitingCount > 0"
            class="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold"
          >
            {{ waitingCount }}
          </span>
        </button>
      </div>

      <div
        class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-none justify-end border-t md:border-t-0 border-gray-100 dark:border-slate-700 pt-2 md:pt-0"
      >
        <div class="relative custom-dropdown-container w-full sm:w-64">
          <div class="relative w-full">
            <Search
              class="absolute left-3 top-2.5 h-4 w-4 text-gray-400 dark:text-slate-500 z-10"
            />
            <input
              :value="searchQuery"
              @input="
                (e) => {
                  $emit('update:searchQuery', e.target.value);
                  showSearchSuggestions = true;
                }
              "
              @focus="showSearchSuggestions = true"
              type="text"
              placeholder="ค้นหาชื่อ, รหัส..."
              class="w-full h-10 pl-9 pr-4 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all dark:placeholder-slate-500"
              autocomplete="off"
            />
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

        <div class="flex items-center gap-2 justify-end">
          <button
            @click="$emit('refresh')"
            class="h-10 w-10 flex items-center justify-center rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 shadow-sm transition-colors shrink-0"
            title="รีเฟรชข้อมูล"
          >
            <RotateCcw class="w-4 h-4" />
          </button>

          <div v-if="activeTab === TASK_STATUS.WAITING" class="flex gap-2">
            <button
              @click="$emit('toggleSelectionMode')"
              class="h-10 px-3 flex items-center gap-2 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap"
              :class="
                isSelectionMode
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-700'
              "
            >
              <CheckSquare class="w-4 h-4" />
              <span class=" sm:inline">{{
                isSelectionMode ? "ยกเลิก" : "เลือกรายการ"
              }}</span>
            </button>

            <button
              v-if="isSelectionMode"
              @click="$emit('toggleSelectAll')"
              class="h-10 px-3 flex items-center gap-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 text-sm font-medium transition-colors whitespace-nowrap"
            >
              <component
                :is="isAllSelected ? CheckSquare : Square"
                class="w-4 h-4"
                :class="isAllSelected ? 'text-indigo-600 dark:text-indigo-400' : ''"
              />
              <span class=" sm:inline">ทั้งหมด</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      class="grid grid-cols-1 md:grid-cols-12 gap-3  p-3 items-center transition-colors duration-300"
    >
      <div
        class="md:col-span-6 lg:col-span-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
      >
        <div class="relative custom-dropdown-container shrink-0">
          <button
            @click="toggleDropdown('date')"
            class="h-10 px-3 w-full sm:w-auto rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-medium text-gray-700 dark:text-gray-200 flex items-center justify-between sm:justify-start gap-2 hover:border-indigo-500 transition-colors"
            :class="{
              'ring-2 ring-indigo-500 border-indigo-500': activeDropdown === 'date',
            }"
          >
            <div class="flex items-center gap-2">
              <CalendarIcon class="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              <span class="truncate max-w-[120px] text-left">{{ currentDateLabel }}</span>
            </div>
            <ChevronDown class="h-3 w-3 text-gray-400" />
          </button>

          <div
            v-if="activeDropdown === 'date'"
            class="absolute top-full left-0 mt-1 w-full sm:w-[160px] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-50 animate-in fade-in zoom-in-95 p-1"
          >
            <div
              v-for="option in dateOptions"
              :key="option.value"
              @click="selectDateRange(option.value)"
              class="px-3 py-2 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-xs cursor-pointer flex items-center justify-between text-gray-700 dark:text-gray-200 transition-colors"
            >
              <span>{{ option.label }}</span>
              <Check
                v-if="currentRange === option.value"
                class="w-3 h-3 text-indigo-600 dark:text-indigo-400"
              />
            </div>
          </div>
        </div>

        <div
          v-if="currentRange === 'custom'"
          class="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm animate-in fade-in slide-in-from-left-2 flex-1 min-w-0"
        >
          <div
            class="relative group cursor-pointer flex-1 min-w-0"
            @click="openStartCalendar"
          >
            <div
              class="flex items-center justify-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-slate-900 hover:bg-indigo-100 dark:hover:bg-slate-700 rounded-md transition-all h-full text-indigo-600 dark:text-indigo-400 font-medium border border-transparent dark:border-slate-700"
            >
              <CalendarIcon class="w-3.5 h-3.5 shrink-0" />
              <span class="text-xs truncate dark:text-white">{{
                displayThaiDate(customStart)
              }}</span>
            </div>
            <input
              ref="startInputRef"
              type="date"
              v-model="customStart"
              class="absolute inset-0 opacity-0 cursor-pointer w-full"
            />
          </div>

          <ArrowRight class="w-3 h-3 text-gray-300 dark:text-slate-600 shrink-0" />

          <div
            class="relative group cursor-pointer flex-1 min-w-0"
            @click="openEndCalendar"
          >
            <div
              class="flex items-center justify-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-slate-900 hover:bg-indigo-100 dark:hover:bg-slate-700 rounded-md transition-all h-full text-indigo-600 dark:text-indigo-400 font-medium border border-transparent dark:border-slate-700"
            >
              <CalendarIcon class="w-3.5 h-3.5 shrink-0" />
              <span class="text-xs truncate dark:text-white">{{
                displayThaiDate(customEnd)
              }}</span>
            </div>
            <input
              ref="endInputRef"
              type="date"
              v-model="customEnd"
              class="absolute inset-0 opacity-0 cursor-pointer w-full"
            />
          </div>

          <button
            @click="handleCustomSearch"
            class="ml-1 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white w-8 h-8 rounded-lg flex items-center justify-center shadow-sm active:scale-95 transition-all shrink-0"
            title="ค้นหา"
          >
            <Search class="w-4 h-4" />
          </button>
        </div>
      </div>

      <div class="md:col-span-5 lg:col-span-5 relative custom-dropdown-container">
        <button
          @click="toggleDropdown('maid')"
          class="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-left flex items-center justify-between hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors"
          :class="{
            'ring-2 ring-indigo-500 border-indigo-500': activeDropdown === 'maid',
          }"
        >
          <div class="flex items-center gap-2 truncate">
            <Users class="w-4 h-4 text-gray-400 dark:text-slate-500" />
            <span class="text-gray-700 dark:text-gray-200 truncate">{{
              getMaidLabel
            }}</span>
          </div>
          <ChevronDown class="h-4 w-4 text-gray-400" />
        </button>

        <div
          v-if="activeDropdown === 'maid'"
          class="absolute top-full left-0 mt-1 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-50 animate-in fade-in zoom-in-95 max-h-48 overflow-y-auto custom-scrollbar p-1"
        >
          <div
            @click="selectMaid('all')"
            class="px-3 py-2 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-sm cursor-pointer flex items-center justify-between text-gray-700 dark:text-gray-200 transition-colors"
          >
            <span>พนักงานทุกคน</span>
            <Check
              v-if="selectedMaid === 'all'"
              class="w-3 h-3 text-indigo-600 dark:text-indigo-400"
            />
          </div>
          <div
            v-for="maid in maids"
            :key="maid.id"
            @click="selectMaid(maid.id)"
            class="px-3 py-2 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-sm cursor-pointer flex items-center justify-between text-gray-700 dark:text-gray-200 transition-colors"
          >
            <span>{{ maid.fullname }}</span>
            <Check
              v-if="selectedMaid === maid.id"
              class="w-3 h-3 text-indigo-600 dark:text-indigo-400"
            />
          </div>
        </div>
      </div>

      <div class="md:col-span-1 flex justify-end md:justify-end items-center h-10">
        <button
          v-if="hasFilters"
          @click="resetFilters"
          class="h-9 w-9 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 transition-colors"
          title="ล้างตัวกรอง"
        >
          <X class="w-4 h-4" />
        </button>
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
</style>