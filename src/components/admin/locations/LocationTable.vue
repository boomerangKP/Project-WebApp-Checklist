<script setup>
import { ref, computed, watch } from "vue";
import {
  Edit,
  Trash2,
  Loader2,
  Check,
  Copy,
  ChevronLeft,
  ChevronRight,
} from "lucide-vue-next";

// --- Props & Emits ---
const props = defineProps({
  items: { type: Array, default: () => [] },
  loading: Boolean,
  highlightId: Number,
});

const emit = defineEmits(["edit", "delete"]);

// --- 1. Pagination Logic (ระบบแบ่งหน้า) ---
const currentPage = ref(1);
const itemsPerPage = ref(100); // ค่าเริ่มต้น 10 รายการ

// คำนวณจำนวนหน้าทั้งหมด
const totalItems = computed(() => props.items.length);
const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value) || 1);

// ✅ จุดที่แก้ไข: ปรับ Logic การ Watch ข้อมูล
watch(
  () => props.items,
  () => {
    if (currentPage.value > totalPages.value) {
      currentPage.value = Math.max(1, totalPages.value);
    }
  }
);

// ✅ เพิ่มฟังก์ชันนี้เพื่อให้ Parent เรียกใช้ตอนกด "ค้นหา" หรือ "เปลี่ยนฟิลเตอร์"
const resetPage = () => {
  currentPage.value = 1;
};

// ✅ ส่งออกฟังก์ชันเพื่อให้ Parent Component เรียกใช้ได้ (ผ่าน ref)
defineExpose({ resetPage });

const startIndex = computed(() => (currentPage.value - 1) * itemsPerPage.value);
const endIndex = computed(() =>
  Math.min(startIndex.value + itemsPerPage.value, totalItems.value)
);

// ตัดข้อมูลเฉพาะหน้าปัจจุบันมาแสดง
const paginatedItems = computed(() => {
  return props.items.slice(startIndex.value, endIndex.value);
});

// คำนวณเลขหน้าที่จะแสดง (เช่น 1 2 ... 5)
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

// --- 2. Copy to Clipboard ---
const copiedId = ref(null);

const copyToClipboard = async (text, id) => {
  try {
    await navigator.clipboard.writeText(text);
    copiedId.value = id;
    setTimeout(() => {
      copiedId.value = null;
    }, 1500);
  } catch (err) {
    console.error("Failed to copy", err);
  }
};

// --- 3. Helper: Status Config (จัดการสีและข้อความสถานะ) ---
const getLocationStatusConfig = (status) => {
  switch (status) {
    case "active":
      return {
        label: "ปกติ",
        textClass: "text-emerald-700 dark:text-emerald-400",
        dotClass: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]",
      };
    case "maintenance":
      return {
        label: "ปิดปรับปรุง",
        textClass: "text-orange-700 dark:text-orange-400",
        dotClass: "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]",
      };
    case "inactive":
      return {
        label: "ปิดใช้งาน",
        textClass: "text-slate-500 dark:text-slate-400",
        dotClass: "bg-slate-400",
      };
    default:
      return {
        label: status || "-",
        textClass: "text-gray-400 dark:text-gray-500",
        dotClass: "bg-gray-300 dark:bg-gray-600",
      };
  }
};
</script>

<template>
  <div
    class="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-295px)] transition-colors duration-300"
  >
    <div class="flex-1 overflow-y-auto overflow-x-auto relative custom-scrollbar">
      <table class="w-full text-left border-collapse">
        <thead
          class="sticky top-0 z-10 bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 text-xs uppercase text-gray-500 dark:text-slate-400 font-semibold tracking-wider shadow-sm"
        >
          <tr>
            <th class="px-6 py-4 whitespace-nowrap min-w-[150px]">Code</th>
            <th class="px-6 py-4 whitespace-nowrap">ชื่อจุดตรวจ</th>
            <th class="px-6 py-4 text-center">อาคาร</th>
            <th class="px-6 py-4 text-center">ชั้น</th>
            <th class="px-6 py-4 text-center">ประเภท</th>
            <th class="px-6 py-4 text-center">สถานะ</th>
            <th class="px-6 py-4 text-right">จัดการ</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-gray-100 dark:divide-slate-700">
          <tr v-if="loading">
            <td
              colspan="7"
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
              colspan="7"
              class="px-6 py-20 text-center text-gray-400 dark:text-slate-500 bg-gray-50/30 dark:bg-slate-800/30"
            >
              ไม่พบข้อมูล
            </td>
          </tr>

          <tr
            v-for="item in paginatedItems"
            :key="item.locations_id"
            class="group transition-all duration-300 hover:bg-gray-50 dark:hover:bg-slate-700/50"
            :class="[
              item.locations_id === highlightId
                ? 'bg-emerald-50 dark:bg-emerald-900/20'
                : '',
            ]"
          >
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center gap-2">
                <button
                  @click="copyToClipboard(item.locations_code, item.locations_id)"
                  class="group/btn flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all duration-200"
                  :class="
                    copiedId === item.locations_id
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                      : 'bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm'
                  "
                  title="คลิกเพื่อคัดลอก"
                >
                  <span class="font-mono text-xs font-semibold tracking-wide">
                    {{ item.locations_code }}
                  </span>

                  <Check v-if="copiedId === item.locations_id" class="w-3 h-3" />
                  <Copy
                    v-else
                    class="w-3 h-3 opacity-30 group-hover/btn:opacity-100 transition-opacity"
                  />
                </button>

                <span
                  v-if="item.locations_id === highlightId"
                  class="text-[10px] font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded-full animate-pulse shadow-sm"
                >
                  NEW
                </span>
              </div>
            </td>

            <td class="px-6 py-4">
              <div class="font-medium text-gray-900 dark:text-white text-sm">
                {{ item.locations_name }}
              </div>
            </td>

            <td class="px-6 py-4 text-center">
              <div
                class="inline-flex items-center gap-1.5 px-2.5 py-1 text-gray-600 dark:text-gray-300 text-xs"
              >
                {{ item.locations_building }}
              </div>
            </td>

            <td class="px-6 py-4 text-center">
              <span
                class="inline-flex items-center justify-center text-xs font-bold text-gray-700 dark:text-white"
              >
                {{ item.locations_floor }}
              </span>
            </td>

            <td class="px-6 py-4 text-center">
              <span
                class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800"
              >
                {{ item.restroom_types?.restroom_types_name || "-" }}
              </span>
            </td>

            <td class="px-6 py-4 text-center">
              <div class="flex justify-center items-center gap-2">
                <div
                  class="w-2 h-2 rounded-full transition-all duration-300"
                  :class="getLocationStatusConfig(item.locations_status).dotClass"
                ></div>
                <span
                  class="text-xs font-medium transition-colors duration-300"
                  :class="getLocationStatusConfig(item.locations_status).textClass"
                >
                  {{ getLocationStatusConfig(item.locations_status).label }}
                </span>
              </div>
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
                  @click="$emit('delete', item.locations_id)"
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
            <option :value="100">100</option>
            <option :value="200">200</option>
            <option :value="500">500</option>
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
