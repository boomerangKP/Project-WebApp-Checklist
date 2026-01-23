<script setup>
import { ref, computed, watch } from "vue";
import {
  Edit,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
} from "lucide-vue-next";

// --- Props & Emits ---
const props = defineProps({
  items: { type: Array, default: () => [] },
  loading: Boolean,
  highlightId: Number,
});

const emit = defineEmits(["edit", "delete"]);

// --- Pagination Logic ---
const currentPage = ref(1);
const itemsPerPage = ref(10);

// คำนวณจำนวนหน้าทั้งหมด
const totalItems = computed(() => props.items.length);
const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value) || 1);

// ✅ ปรับ Logic การ Watch ข้อมูล
watch(
  () => props.items,
  () => {
    if (currentPage.value > totalPages.value) {
      currentPage.value = Math.max(1, totalPages.value);
    }
  }
);

// ✅ ฟังก์ชันรีเซ็ตหน้า
const resetPage = () => {
  currentPage.value = 1;
};

defineExpose({ resetPage });

const startIndex = computed(() => (currentPage.value - 1) * itemsPerPage.value);
const endIndex = computed(() =>
  Math.min(startIndex.value + itemsPerPage.value, totalItems.value)
);

const paginatedItems = computed(() => {
  return props.items.slice(startIndex.value, endIndex.value);
});

const visiblePages = computed(() => {
  const pages = [];
  const delta = 1;
  if (totalPages.value <= 5) {
    for (let i = 1; i <= totalPages.value; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage.value > delta + 2) pages.push("...");
    for (
      let i = Math.max(2, currentPage.value - delta);
      i <= Math.min(totalPages.value - 1, currentPage.value + delta);
      i++
    ) {
      pages.push(i);
    }
    if (currentPage.value < totalPages.value - delta - 1) pages.push("...");
    pages.push(totalPages.value);
  }
  return pages;
});

const changePage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};
</script>

<template>
  <div
    class="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-320px)] transition-colors duration-300"
  >
    <div class="flex-1 overflow-y-auto overflow-x-auto relative custom-scrollbar">
      <table class="w-full text-left border-collapse">
        <thead
          class="sticky top-0 z-10 bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 text-xs uppercase text-gray-500 dark:text-slate-400 font-semibold tracking-wider shadow-sm"
        >
          <tr>
            <th class="px-6 py-4 text-center w-20">ลำดับ</th>
            <th class="px-6 py-4 whitespace-nowrap">หัวข้อการประเมิน</th>
            <th class="px-6 py-4">คำอธิบายเพิ่มเติม</th>
            <th class="px-6 py-4 text-center w-32">สถานะ</th>
            <th class="px-6 py-4 text-right w-32">จัดการ</th>
          </tr>
        </thead>

        <tbody
          class="divide-y divide-gray-100 dark:divide-slate-700 bg-white dark:bg-slate-800"
        >
          <tr v-if="loading">
            <td
              colspan="5"
              class="px-6 py-20 text-center text-gray-400 dark:text-slate-500"
            >
              <div class="flex flex-col items-center justify-center h-full">
                <Loader2
                  class="w-8 h-8 animate-spin mb-2 text-indigo-500 dark:text-indigo-400"
                />
                <span>กำลังโหลดข้อมูล...</span>
              </div>
            </td>
          </tr>

          <tr v-else-if="items.length === 0">
            <td
              colspan="5"
              class="px-6 py-20 text-center text-gray-400 dark:text-slate-500 bg-gray-50/30 dark:bg-slate-800/30"
            >
              ไม่พบข้อมูลแบบประเมิน
            </td>
          </tr>

          <tr
            v-for="item in paginatedItems"
            :key="item.id"
            class="group transition-all duration-300 hover:bg-gray-50 dark:hover:bg-slate-700/50"
            :class="[
              item.id === highlightId ? 'bg-emerald-50 dark:bg-emerald-900/20' : '',
            ]"
          >
            <td class="px-6 py-4 text-center dark:text-slate-300">
              {{ item.ordering }}
            </td>

            <td class="px-6 py-4">
              <div
                class="font-bold text-gray-800 dark:text-white text-sm flex items-center gap-2"
              >
                {{ item.name }}
                <span
                  v-if="item.id === highlightId"
                  class="text-[10px] font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded-full animate-pulse shadow-sm"
                  >NEW</span
                >
              </div>
            </td>

            <td class="px-6 py-4">
              <div
                class="text-sm text-gray-500 dark:text-slate-400 max-w-xs truncate"
                :title="item.description"
              >
                {{ item.description || "-" }}
              </div>
            </td>

            <td class="px-6 py-4 text-center">
              <span
                v-if="item.is_active"
                class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 whitespace-nowrap"
              >
                <CheckCircle class="w-3 h-3" /> ใช้งาน
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-gray-200 dark:border-gray-700 whitespace-nowrap"
              >
                <XCircle class="w-3 h-3" /> ปิดใช้งาน
              </span>
            </td>

            <td class="px-6 py-4 text-right">
              <div
                class="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity"
              >
                <button
                  @click="$emit('edit', item)"
                  class="p-2 text-gray-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                  title="แก้ไข"
                >
                  <Edit class="w-4 h-4" />
                </button>
                <button
                  @click="$emit('delete', item.id)"
                  class="p-2 text-gray-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  title="ลบ"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="!loading && totalItems > 0"
      class="border-t border-gray-200 dark:border-slate-700 p-2 bg-white dark:bg-slate-800 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600 dark:text-slate-400 transition-colors"
    >
      <div class="flex flex-wrap items-center gap-4 justify-center sm:justify-start">
        <span class="whitespace-nowrap">
          แสดง
          <span class="font-semibold text-gray-900 dark:text-white">{{
            totalItems === 0 ? 0 : startIndex + 1
          }}</span>
          ถึง
          <span class="font-semibold text-gray-900 dark:text-white">{{ endIndex }}</span>
          จาก
          <span class="font-semibold text-gray-900 dark:text-white">{{
            totalItems
          }}</span>
          รายการ
        </span>

        <div class="flex items-center gap-2">
          <span>แสดง:</span>
          <select
            v-model="itemsPerPage"
            class="bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-white text-xs rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-1.5 cursor-pointer outline-none shadow-sm"
          >
            <option :value="5">5</option>
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
          </select>
        </div>
      </div>

      <div class="flex items-center gap-1">
        <button
          @click="changePage(currentPage - 1)"
          :disabled="currentPage === 1"
          class="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-600 dark:text-slate-400"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>

        <div class="flex gap-1">
          <template v-for="(p, index) in visiblePages" :key="index">
            <span v-if="p === '...'" class="px-2 py-1 text-gray-400 dark:text-slate-500"
              >...</span
            >
            <button
              v-else
              @click="changePage(p)"
              class="px-3 py-1 rounded-lg text-xs font-medium transition-all shadow-sm"
              :class="
                currentPage === p
                  ? 'bg-indigo-600 dark:bg-indigo-600 text-white'
                  : 'bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300'
              "
            >
              {{ p }}
            </button>
          </template>
        </div>

        <button
          @click="changePage(currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-600 dark:text-slate-400"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Scrollbar สวยๆ */
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #f8fafc;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
  border: 2px solid #f8fafc;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* ✅ Dark Mode Scrollbar */
:global(.dark) .custom-scrollbar::-webkit-scrollbar-track {
  background: #1e293b; /* slate-800 */
}
:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
  background: #475569; /* slate-600 */
  border: 2px solid #1e293b;
}
:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #64748b; /* slate-500 */
}
</style>
