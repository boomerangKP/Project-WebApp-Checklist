<script setup>
import { ref, computed, watch } from "vue";
import {
  Loader2,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Clock,
  Hash,
  Check,
  Copy,
} from "lucide-vue-next";

const props = defineProps(["logs", "loading"]);
const emit = defineEmits(["update:search", "view"]);

// --- Pagination State ---
const currentPage = ref(1);
const itemsPerPage = ref(10);
const copiedId = ref(null);

watch(
  () => props.logs,
  () => {
    currentPage.value = 1;
  }
);

// --- Computed Logic ---
const totalPages = computed(
  () => Math.ceil((props.logs?.length || 0) / itemsPerPage.value) || 1
);
const paginatedLogs = computed(() => {
  if (!props.logs) return [];
  const start = (currentPage.value - 1) * itemsPerPage.value;
  return props.logs.slice(start, start + itemsPerPage.value);
});
const startEntry = computed(() =>
  props.logs?.length === 0 ? 0 : (currentPage.value - 1) * itemsPerPage.value + 1
);
const endEntry = computed(() =>
  Math.min(currentPage.value * itemsPerPage.value, props.logs?.length || 0)
);

// --- Helpers ---
const changePage = (p) => {
  if (p >= 1 && p <= totalPages.value) currentPage.value = p;
};
const formatThaiDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        calendar: "buddhist",
      })
    : "-";
const getStatusColor = (s) =>
  ["pass", "approved", "fixed"].includes(s)
    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : ["fail", "rejected"].includes(s)
    ? "bg-rose-100 text-rose-700 border-rose-200"
    : "bg-gray-100 text-gray-700 border-gray-200";
const getStatusLabel = (s) =>
  ({
    pass: "เรียบร้อย",
    approved: "อนุมัติ",
    fixed: "แก้ไขแล้ว",
    fail: "พบปัญหา",
    rejected: "ปฏิเสธ",
    waiting: "รอตรวจ",
  }[s] || s);

const copyJobId = async (id) => {
  try {
    await navigator.clipboard.writeText(`#${id.toString().padStart(6, "0")}`);
    copiedId.value = id;
    setTimeout(() => (copiedId.value = null), 2000);
  } catch (e) {}
};
</script>

<template>
  <div
    class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-300px)] w-full relative"
  >
    <div
      class="px-4 py-2 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 bg-white"
    >
      <h2 class="font-bold text-gray-800 text-base whitespace-nowrap">รายการตรวจสอบ</h2>
      <div class="relative w-full sm:w-60">
        <input
          @input="$emit('update:search', $event.target.value)"
          type="text"
          placeholder="ค้นหา..."
          class="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <Search
          class="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2"
        />
      </div>
    </div>

    <div class="flex-1 overflow-auto custom-scrollbar">
      <table class="w-full text-left border-collapse min-w-[900px]">
        <thead
          class="sticky top-0 z-10 bg-gray-50/95 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider backdrop-blur-sm shadow-sm"
        >
          <tr>
            <th class="px-4 py-2.5 font-medium whitespace-nowrap w-[130px]">รหัสงาน</th>
            <th class="px-4 py-2.5 font-medium whitespace-nowrap">วันที่ตรวจ</th>
            <th class="px-4 py-2.5 font-medium whitespace-nowrap">พนักงาน</th>
            <th class="px-4 py-2.5 font-medium whitespace-nowrap">สถานที่</th>
            <th class="px-4 py-2.5 font-medium text-center whitespace-nowrap">สถานะ</th>
            <th class="px-4 py-2.5 font-medium text-right whitespace-nowrap">จัดการ</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-gray-100 bg-white text-sm">
          <tr v-if="loading">
            <td colspan="6" class="px-6 py-10 text-center text-gray-400">
              <Loader2 class="w-6 h-6 animate-spin mx-auto mb-2" />กำลังโหลด...
            </td>
          </tr>
          <tr v-else-if="paginatedLogs.length === 0">
            <td colspan="6" class="px-6 py-10 text-center text-gray-400">ไม่พบข้อมูล</td>
          </tr>

          <tr
            v-else
            v-for="log in paginatedLogs"
            :key="log.check_sessions_id"
            class="hover:bg-gray-50 transition-colors group"
          >
            <td class="px-4 py-2.5">
              <button
                @click.stop="copyJobId(log.check_sessions_id)"
                class="group/btn flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all duration-200"
                :class="
                  copiedId === log.check_sessions_id
                    ? 'bg-emerald-100 border-emerald-200 text-emerald-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 shadow-sm'
                "
                title="คลิกเพื่อคัดลอก"
              >
                <span class="font-mono text-xs font-semibold tracking-wide">
                  #{{ log.check_sessions_id.toString().padStart(6, "0") }}
                </span>

                <Check v-if="copiedId === log.check_sessions_id" class="w-3 h-3" />
                <Copy
                  v-else
                  class="w-3 h-3 opacity-30 group-hover/btn:opacity-100 transition-opacity"
                />
              </button>
            </td>
            <td class="px-4 py-2.5 text-gray-600">
              <div class="flex items-center gap-2">
                <Clock class="w-3.5 h-3.5 text-gray-400" />{{
                  formatThaiDate(log.created_at)
                }}
              </div>
            </td>
            <td class="px-4 py-2.5">
              <div class="flex items-center gap-2">
                <img
                  :src="
                    log.employees?.employees_photo || 'https://via.placeholder.com/40'
                  "
                  class="w-7 h-7 rounded-full object-cover border"
                />
                <span class="font-medium text-gray-900">{{
                  log.employees?.employees_firstname
                }}</span>
              </div>
            </td>
            <td class="px-4 py-2.5">
              <div class="font-medium text-gray-900">
                {{ log.locations?.locations_name }}
              </div>
              <div class="text-xs text-gray-500">
                {{ log.locations?.locations_building }} •
                {{ log.locations?.locations_floor }}
              </div>
            </td>
            <td class="px-4 py-2.5 text-center">
              <span
                class="px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                :class="getStatusColor(log.check_sessions_status)"
                >{{ getStatusLabel(log.check_sessions_status) }}</span
              >
            </td>
            <td class="px-4 py-2.5 text-right">
              <button
                @click="$emit('view', log.check_sessions_id)"
                class="text-gray-400 hover:text-indigo-600 p-1.5 rounded-full hover:bg-indigo-50"
              >
                <Eye class="w-4 h-4" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="!loading && logs.length > 0"
      class="bg-white px-4 py-2 border-t border-gray-200 shrink-0 flex items-center justify-between text-xs sticky bottom-0 z-20"
    >
      <div class="flex items-center gap-3 text-gray-600">
        <span>แสดง {{ startEntry }} ถึง {{ endEntry }} จาก {{ logs.length }}</span>
        <span>แสดง:</span
        ><select
          v-model="itemsPerPage"
          class="border rounded px-1 py-0.5 focus:ring-1 bg-white cursor-pointer"
        >
          <option :value="10">10</option>
          <option :value="20">20</option>
          <option :value="50">50</option>
        </select>
      </div>
      <div class="flex items-center gap-1">
        <button
          @click="changePage(currentPage - 1)"
          :disabled="currentPage === 1"
          class="p-1 rounded border hover:bg-gray-50 disabled:opacity-50"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>
        <span class="px-2 font-medium">{{ currentPage }} / {{ totalPages }}</span>
        <button
          @click="changePage(currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="p-1 rounded border hover:bg-gray-50 disabled:opacity-50"
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
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
