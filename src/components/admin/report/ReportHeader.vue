<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from "vue";
import {
  Calendar as CalendarIcon,
  Search,
  ChevronDown,
  ArrowRight,
  Check,
} from "lucide-vue-next";

// ✅ 1. นำเข้าปุ่ม Export ที่เราสร้างไว้
import ExportReportButton from "@/components/admin/export/ExportReportButton.vue";

const props = defineProps(["loading"]);
const emit = defineEmits(["update:range"]);

// --- State ---
const dateRange = ref("today");
const customStart = ref(new Date().toISOString().slice(0, 10));
const customEnd = ref(new Date().toISOString().slice(0, 10));
const startInputRef = ref(null);
const endInputRef = ref(null);

// --- Dropdown State ---
const isDropdownOpen = ref(false);

// ตัวเลือกช่วงเวลา
const rangeOptions = [
  { value: "today", label: "วันนี้" },
  { value: "yesterday", label: "เมื่อวาน" },
  { value: "week", label: "7 วันล่าสุด" },
  { value: "month", label: "เดือนนี้" },
  { value: "custom", label: "กำหนดเอง..." },
];

// แสดงชื่อตัวเลือกที่เลือกอยู่
const currentRangeLabel = computed(() => {
  const found = rangeOptions.find((o) => o.value === dateRange.value);
  return found ? found.label : "เลือกช่วงเวลา";
});

// --- Actions ---
const toggleDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value;
};

const selectRange = (value) => {
  dateRange.value = value;
  isDropdownOpen.value = false;
};

const displayThaiDate = (isoDate) => {
  if (!isoDate) return "เลือกวันที่";
  const date = new Date(isoDate);
  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    calendar: "buddhist",
  });
};

const openStartCalendar = () => {
  if (startInputRef.value?.showPicker) startInputRef.value.showPicker();
  else startInputRef.value?.focus();
};

const openEndCalendar = () => {
  if (endInputRef.value?.showPicker) endInputRef.value.showPicker();
  else endInputRef.value?.focus();
};

// --- Logic คำนวณวันที่ (คงเดิม) ---
const computedDateRange = computed(() => {
  const end = new Date();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  switch (dateRange.value) {
    case "today":
      break;
    case "yesterday":
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
      break;
    case "week":
      start.setDate(start.getDate() - 6);
      break;
    case "month":
      start.setDate(1);
      break;
    case "custom":
      return {
        start: customStart.value ? new Date(customStart.value).toISOString() : null,
        end: customEnd.value
          ? new Date(customEnd.value + "T23:59:59").toISOString()
          : null,
      };
  }

  return { start: start.toISOString(), end: end.toISOString() };
});

// Watch & Emit (คงเดิม)
watch([dateRange, customStart, customEnd], () => {
  if (dateRange.value !== "custom") {
    emit("update:range", { type: dateRange.value, ...computedDateRange.value });
  }
});

const handleCustomSearch = () => {
  emit("update:range", { type: "custom", ...computedDateRange.value });
};

// --- Click Outside ---
const handleClickOutside = (e) => {
  if (!e.target.closest(".custom-dropdown-container")) {
    isDropdownOpen.value = false;
  }
};

onMounted(() => window.addEventListener("click", handleClickOutside));
onUnmounted(() => window.removeEventListener("click", handleClickOutside));
</script>

<template>
  <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-800 dark:text-white tracking-tight">
        รายงานผลการปฏิบัติงาน
      </h1>
      <p class="text-gray-500 dark:text-slate-400 text-sm mt-1">สรุปข้อมูลย้อนหลังและสถิติการทำงาน</p>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <div class="relative custom-dropdown-container min-w-[180px]">
        <button
          @click="toggleDropdown"
          class="flex items-center justify-between w-full h-11 px-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm hover:border-indigo-500 dark:hover:border-indigo-500 transition-all text-sm font-semibold text-gray-700 dark:text-white"
          :class="{ 'ring-2 ring-indigo-100 dark:ring-indigo-900 border-indigo-500 dark:border-indigo-500': isDropdownOpen }"
        >
          <div class="flex items-center gap-2">
            <CalendarIcon class="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            <span>{{ currentRangeLabel }}</span>
          </div>
          <ChevronDown
            class="w-4 h-4 text-gray-400 dark:text-slate-500 transition-transform duration-200"
            :class="{ 'rotate-180': isDropdownOpen }"
          />
        </button>

        <div
          v-if="isDropdownOpen"
          class="absolute top-full left-0 mt-1 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        >
          <div class="p-1">
            <div
              v-for="option in rangeOptions"
              :key="option.value"
              @click="selectRange(option.value)"
              class="px-3 py-2.5 rounded-lg text-sm cursor-pointer flex items-center justify-between group transition-colors"
              :class="
                dateRange === option.value
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-medium'
                  : 'hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300'
              "
            >
              <span>{{ option.label }}</span>
              <Check v-if="dateRange === option.value" class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="dateRange === 'custom'"
        class="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm animate-in fade-in slide-in-from-right-4"
      >
        <div class="relative group cursor-pointer" @click="openStartCalendar">
          <div
            class="flex items-center gap-2 bg-gray-50 dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-800 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-700 rounded-lg px-3 py-1.5 transition-all"
          >
            <CalendarIcon class="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            <span class="text-sm font-medium text-gray-700 dark:text-white min-w-[80px] text-center">{{
              displayThaiDate(customStart)
            }}</span>
          </div>
          <input
            ref="startInputRef"
            type="date"
            v-model="customStart"
            class="absolute bottom-0 left-0 w-0 h-0 opacity-0 pointer-events-none"
          />
        </div>

        <ArrowRight class="w-4 h-4 text-gray-300 dark:text-slate-600" />

        <div class="relative group cursor-pointer" @click="openEndCalendar">
          <div
            class="flex items-center gap-2 bg-gray-50 dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-800 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-700 rounded-lg px-3 py-1.5 transition-all"
          >
            <CalendarIcon class="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            <span class="text-sm font-medium text-gray-700 dark:text-white min-w-[80px] text-center">{{
              displayThaiDate(customEnd)
            }}</span>
          </div>
          <input
            ref="endInputRef"
            type="date"
            v-model="customEnd"
            class="absolute bottom-0 left-0 w-0 h-0 opacity-0 pointer-events-none"
          />
        </div>

        <button
          @click="handleCustomSearch"
          class="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white p-2 rounded-lg shadow-sm active:scale-95 ml-1 transition-all"
        >
          <Search class="w-4 h-4" />
        </button>
      </div>

      <ExportReportButton
        class="ml-auto sm:ml-0 h-11"
        :startDate="computedDateRange.start"
        :endDate="computedDateRange.end"
      />
    </div>
  </div>
</template>