<script setup>
import { ref, computed, watch } from "vue";
import {
  MapPin,
  CheckSquare,
  Square,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-vue-next";

const props = defineProps({
  locations: Array,
  loading: Boolean,
  selectedIds: Set,
});

const emit = defineEmits(["toggle", "toggle-all"]);

// --- ⚡ ส่วน Pagination State ---
const currentPage = ref(1);
const itemsPerPage = ref(10);

watch(
  () => props.locations,
  () => {
    currentPage.value = 1;
  }
);

const totalPages = computed(
  () => Math.ceil(props.locations.length / itemsPerPage.value) || 1
);

const paginatedLocations = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return props.locations.slice(start, end);
});

const startItem = computed(() =>
  props.locations.length === 0 ? 0 : (currentPage.value - 1) * itemsPerPage.value + 1
);
const endItem = computed(() =>
  Math.min(currentPage.value * itemsPerPage.value, props.locations.length)
);

// --- 🔢 Logic สร้างปุ่มตัวเลข ---
const visiblePages = computed(() => {
  const pages = [];
  const total = totalPages.value;
  const current = currentPage.value;

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current > 3) pages.push("...");
    let start = Math.max(2, current - 1);
    let end = Math.min(total - 1, current + 1);
    if (current <= 3) end = 4;
    if (current >= total - 2) start = total - 3;
    for (let i = start; i <= end; i++) pages.push(i);
    if (current < total - 2) pages.push("...");
    pages.push(total);
  }
  return pages;
});

const changePage = (page) => {
  if (page === "...") return;
  if (page >= 1 && page <= totalPages.value) currentPage.value = page;
};

const isAllSelected = computed(() => {
  return (
    props.locations.length > 0 &&
    props.locations.every((l) => props.selectedIds.has(l.locations_id))
  );
});
</script>

<template>
  <div
    class="flex-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full transition-colors duration-300"
  >
    <div
      class="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider items-center flex-shrink-0"
    >
      <div class="col-span-1 flex justify-center">
        <button
          @click="$emit('toggle-all')"
          class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          title="เลือกทั้งหมด"
        >
          <component
            :is="isAllSelected ? CheckSquare : Square"
            class="w-5 h-5"
            :class="
              isAllSelected
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-gray-400 dark:text-slate-600'
            "
          />
        </button>
      </div>
      <div class="col-span-2">รหัสสถานที่</div>
      <div class="col-span-3">ชื่อจุดตรวจ</div>
      <div class="col-span-2 text-center">ประเภทห้องน้ำ</div>
      <div class="col-span-2 text-center">อาคาร</div>
      <div class="col-span-2 text-center">ชั้น</div>
    </div>

    <div class="overflow-y-auto custom-scrollbar flex-1 relative">
      <div
        v-if="loading"
        class="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-800/80 z-10"
      >
        <Loader2 class="w-8 h-8 animate-spin mb-2 text-indigo-500 dark:text-indigo-400" />
        <p class="text-gray-500 dark:text-slate-400 text-sm">กำลังโหลดข้อมูล...</p>
      </div>

      <div
        v-else-if="locations.length === 0"
        class="flex flex-col items-center justify-center h-full text-gray-400 dark:text-slate-500 min-h-[200px]"
      >
        <MapPin class="w-12 h-12 mb-2 opacity-20" />
        <p>ไม่พบสถานที่</p>
      </div>

      <div v-else>
        <div
          v-for="loc in paginatedLocations"
          :key="loc.locations_id"
          @click="$emit('toggle', loc.locations_id)"
          class="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-100 dark:border-slate-700 hover:bg-indigo-50/50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors items-center group"
          :class="
            selectedIds.has(loc.locations_id)
              ? 'bg-indigo-50/80 dark:bg-indigo-900/20'
              : ''
          "
        >
          <div class="col-span-1 flex justify-center">
            <component
              :is="selectedIds.has(loc.locations_id) ? CheckSquare : Square"
              class="w-5 h-5 transition-colors"
              :class="
                selectedIds.has(loc.locations_id)
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-300 dark:text-slate-600 group-hover:text-indigo-400 dark:group-hover:text-indigo-400'
              "
            />
          </div>
          <div
            class="col-span-2 font-mono text-xs font-bold text-gray-500 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded w-fit group-hover:bg-white dark:group-hover:bg-slate-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
          >
            {{ loc.locations_code }}
          </div>
          <div
            class="col-span-3 font-medium text-gray-800 dark:text-white truncate"
            :title="loc.locations_name"
          >
            {{ loc.locations_name }}
          </div>

          <div class="col-span-2 text-center text-sm text-gray-600 dark:text-slate-400">
            {{ loc.restroom_types?.restroom_types_name || "-" }}
          </div>

          <div class="col-span-2 text-center text-sm text-gray-600 dark:text-slate-400">
            {{ loc.locations_building }}
          </div>
          <div class="col-span-2 text-center text-sm text-gray-600 dark:text-slate-400">
            {{ loc.locations_floor }}
          </div>
        </div>
      </div>
    </div>

    <div
      class="border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0 z-10 py-2 px-4 flex flex-col sm:flex-row items-center justify-between gap-4 select-none"
      v-if="locations.length > 0"
    >
      <div
        class="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-slate-400"
      >
        <span class="whitespace-nowrap">
          แสดง
          <span class="font-bold text-gray-900 dark:text-white">{{ startItem }}</span> ถึง
          <span class="font-bold text-gray-900 dark:text-white">{{ endItem }}</span> จาก
          <span class="font-bold text-gray-900 dark:text-white">{{
            locations.length
          }}</span>
          รายการ
        </span>
        <div class="flex items-center gap-2">
          <span>แสดง:</span>
          <select
            v-model="itemsPerPage"
            @change="currentPage = 1"
            class="border border-gray-300 dark:border-slate-600 rounded-md py-1 px-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm min-w-[60px]"
          >
            <option :value="20">20</option>
            <option :value="30">30</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
        </div>
      </div>
      <div class="flex items-center gap-1">
        <button
          @click="changePage(currentPage - 1)"
          :disabled="currentPage === 1"
          class="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-600 hover:text-gray-700 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>

        <button
          v-for="(page, index) in visiblePages"
          :key="index"
          @click="changePage(page)"
          class="w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-all"
          :class="[
            page === currentPage
              ? 'bg-indigo-600 dark:bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none border border-indigo-600'
              : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 hover:border-gray-300 dark:hover:border-slate-500',
            page === '...'
              ? 'border-none bg-transparent cursor-default text-gray-400 dark:text-slate-500 hover:bg-transparent'
              : '',
          ]"
        >
          {{ page }}
        </button>

        <button
          @click="changePage(currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-600 hover:text-gray-700 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
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
