<script setup>
import { ref, computed, watch } from "vue";
import {
  FileSpreadsheet,
  Loader2,
  Calendar as CalendarIcon,
  ArrowRight,
  Search,
  ChevronDown,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-vue-next";
import { useReportSatisfaction } from "@/composables/useReportSatisfaction";
import { useSwal } from "@/composables/useSwal";

// Components
import StatsCards from "@/components/admin/report/StatsCards.vue";
import FeedbackCharts from "@/components/admin/report/FeedbackCharts.vue";
import RecentFeedbackTable from "@/components/admin/report/RecentFeedbackTable.vue";

const { Swal } = useSwal();

const {
  loading,
  feedbacks,
  dateFilter,
  customStart,
  customEnd,
  searchCustom,
  stats,
  trendChartData,
  topicChartData,
  exportToExcel,
  // ✅ Pagination Vars
  totalItems,
  currentPage,
  totalPages,
  itemsPerPage, 
  changePage,
} = useReportSatisfaction();

// --- Helper: คำนวณช่วงวันที่จริง ---
const getActualDateRange = () => {
  const now = new Date();
  let start = new Date();
  let end = new Date();

  if (dateFilter.value === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (dateFilter.value === "week") {
    const day = start.getDay() || 7;
    if (day !== 1) start.setHours(-24 * (day - 1));
    start.setHours(0, 0, 0, 0);
  } else if (dateFilter.value === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else if (dateFilter.value === "custom") {
    if (customStart.value) start = new Date(customStart.value);
    if (customEnd.value) end = new Date(customEnd.value);
    // ปรับเวลาจบของวันให้เป็น 23:59:59 เพื่อให้ครอบคลุมทั้งวัน
    end.setHours(23, 59, 59, 999);
  }

  if (isNaN(start.getTime())) start = new Date();
  if (isNaN(end.getTime())) end = new Date();

  return {
    start, // ✅ ส่ง object วันที่ออกไปด้วย
    end,   // ✅ ส่ง object วันที่ออกไปด้วย
    startStr: start.toLocaleDateString("th-TH", { dateStyle: "long" }),
    endStr: end.toLocaleDateString("th-TH", { dateStyle: "long" }),
  };
};

// --- Calendar Logic ---
const startInputRef = ref(null);
const endInputRef = ref(null);
const openStartCalendar = () => startInputRef.value?.showPicker();
const openEndCalendar = () => endInputRef.value?.showPicker();

const displayThaiDate = (dateString) => {
  const d = dateString ? new Date(dateString) : new Date();
  return d.toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
};

watch(dateFilter, (newVal) => {
  if (newVal === "custom") {
    const today = new Date().toISOString().split("T")[0];
    if (!customStart.value) customStart.value = today;
    if (!customEnd.value) customEnd.value = today;
  }
});

// --- Dropdown Logic ---
const isFilterOpen = ref(false);
const filterOptions = [
  { value: "today", label: "วันนี้" },
  { value: "week", label: "สัปดาห์นี้" },
  { value: "month", label: "เดือนนี้" },
  { value: "custom", label: "กำหนดเอง" },
];

const selectedFilterLabel = computed(
  () => filterOptions.find((o) => o.value === dateFilter.value)?.label || "เลือกช่วงเวลา"
);
const selectFilter = (value) => {
  dateFilter.value = value;
  isFilterOpen.value = false;
};

// --- Export Logic ---
const isExporting = ref(false);

const confirmExport = () => {
  const count = totalItems?.value || 0;

  if (count === 0) {
    Swal.fire({
      icon: "warning",
      title: "ไม่มีข้อมูล",
      text: "ไม่พบรายการข้อมูลในช่วงเวลาที่เลือก",
      confirmButtonText: "ตกลง",
    });
    return;
  }

  // ✅ ดึงค่า start, end ที่เป็น Date Object มาใช้
  const { startStr, endStr, start, end } = getActualDateRange();

  Swal.fire({
    title: "ยืนยันการดาวน์โหลด?",
    html: `
      ต้องการดาวน์โหลดรายงานตั้งแต่วันที่ <br/>
      <b class="text-indigo-600 dark:text-indigo-400">${startStr}</b> ถึง <b class="text-indigo-600 dark:text-indigo-400">${endStr}</b> <br/><br/>
      จำนวนทั้งสิ้น <b class="text-emerald-600 dark:text-emerald-400 text-lg">${count}</b> รายการ
    `,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "ใช่, ดาวน์โหลดเลย",
    cancelButtonText: "ยกเลิก",
  }).then(async (result) => {
    if (result.isConfirmed) {
      isExporting.value = true;
      await new Promise((r) => setTimeout(r, 800));

      // ✅ ส่ง startDate และ endDate ไปให้ฟังก์ชัน exportToExcel
      // เพื่อให้มันดึงข้อมูลมา Loop Batch (เร็วขึ้น)
      await exportToExcel({
          startDate: start.toISOString(),
          endDate: end.toISOString()
      });

      isExporting.value = false;
      // ❌ ไม่ต้อง Swal success ตรงนี้แล้ว เพราะใน useReportSatisfaction มี Swal แจ้งเตือนที่ละเอียดกว่า
    }
  });
};
</script>

<template>
  <div class="space-y-6 pb-10">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          รายงานความพึงพอใจ
        </h1>
        <p class="text-gray-500 dark:text-slate-400 text-sm mt-1">
          สรุปคะแนนการประเมินจากผู้ใช้บริการ
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <div class="relative">
          <button
            @click="isFilterOpen = !isFilterOpen"
            class="flex items-center justify-between gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 text-sm font-medium text-gray-700 dark:text-white min-w-[140px] transition-all"
          >
            <div class="flex items-center gap-2">
              <CalendarIcon class="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              <span>{{ selectedFilterLabel }}</span>
            </div>
            <ChevronDown
              class="w-4 h-4 text-gray-400 dark:text-slate-500 transition-transform"
              :class="{ 'rotate-180': isFilterOpen }"
            />
          </button>

          <div
            v-if="isFilterOpen"
            class="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          >
            <div class="p-1">
              <button
                v-for="option in filterOptions"
                :key="option.value"
                @click="selectFilter(option.value)"
                class="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                :class="
                  dateFilter === option.value
                    ? 'text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50 dark:bg-indigo-900/30'
                    : 'text-gray-600 dark:text-gray-300'
                "
              >
                {{ option.label }}
                <Check
                  v-if="dateFilter === option.value"
                  class="w-4 h-4 text-indigo-600 dark:text-indigo-400"
                />
              </button>
            </div>
          </div>
          <div v-if="isFilterOpen" @click="isFilterOpen = false" class="fixed inset-0 z-10" />
        </div>

        <div
          v-if="dateFilter === 'custom'"
          class="flex items-center gap-2 bg-white dark:bg-slate-800 p-1 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm animate-in fade-in slide-in-from-right-4 h-10"
        >
          <div class="relative group cursor-pointer h-full" @click="openStartCalendar">
            <div
              class="flex items-center gap-2 bg-gray-50 dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-800 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-700 rounded px-3 h-full transition-all"
            >
              <CalendarIcon class="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              <span class="text-xs font-medium text-gray-700 dark:text-white min-w-[70px] text-center whitespace-nowrap">
                {{ displayThaiDate(customStart) }}
              </span>
            </div>
            <input
              ref="startInputRef"
              type="date"
              v-model="customStart"
              class="absolute bottom-0 left-0 w-0 h-0 opacity-0 pointer-events-none"
            />
          </div>

          <ArrowRight class="w-3 h-3 text-gray-300 dark:text-slate-600" />

          <div class="relative group cursor-pointer h-full" @click="openEndCalendar">
            <div
              class="flex items-center gap-2 bg-gray-50 dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-800 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-700 rounded px-3 h-full transition-all"
            >
              <CalendarIcon class="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              <span class="text-xs font-medium text-gray-700 dark:text-white min-w-[70px] text-center whitespace-nowrap">
                {{ displayThaiDate(customEnd) }}
              </span>
            </div>
            <input
              ref="endInputRef"
              type="date"
              v-model="customEnd"
              class="absolute bottom-0 left-0 w-0 h-0 opacity-0 pointer-events-none"
            />
          </div>

          <button
            @click="searchCustom"
            class="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white w-8 h-8 rounded flex items-center justify-center shadow-sm active:scale-95 transition-all"
          >
            <Search class="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          @click="confirmExport"
          :disabled="isExporting"
          class="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed h-10 text-xs font-medium"
        >
          <Loader2 v-if="isExporting" class="w-4 h-4 animate-spin" />
          <FileSpreadsheet v-else class="w-4 h-4" />
          <span>{{ isExporting ? "กำลังสร้างไฟล์..." : "Export Excel" }}</span>
        </button>
      </div>
    </div>

    <div v-if="loading" class="h-64 flex flex-col items-center justify-center">
      <Loader2 class="w-10 h-10 animate-spin text-indigo-500 dark:text-indigo-400 mb-2" />
      <span class="text-gray-400 dark:text-slate-500">กำลังประมวลผลข้อมูล...</span>
    </div>

    <div v-else class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <StatsCards :stats="stats" />
      <FeedbackCharts :trendData="trendChartData" :topicData="topicChartData" />

      <div>
        <RecentFeedbackTable :feedbacks="feedbacks" />

        <div
          v-if="totalItems > 0"
          class="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-3 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 shadow-sm"
        >
          <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
            <span>แสดง</span>
            <span class="font-bold text-gray-900 dark:text-white">50</span>
            <span>รายการ (จาก {{ totalItems }})</span>
          </div>

          <div class="flex items-center gap-3">
            <span class="text-sm text-gray-500 dark:text-slate-400">
              หน้า {{ currentPage }} / {{ totalPages }}
            </span>
            <div class="flex items-center gap-1">
              <button
                @click="changePage(currentPage - 1)"
                :disabled="currentPage === 1"
                class="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 dark:border-slate-600 transition-colors"
              >
                <ChevronLeft class="w-4 h-4 text-gray-600 dark:text-slate-300" />
              </button>
              <button
                @click="changePage(currentPage + 1)"
                :disabled="currentPage === totalPages"
                class="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 dark:border-slate-600 transition-colors"
              >
                <ChevronRight class="w-4 h-4 text-gray-600 dark:text-slate-300" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>