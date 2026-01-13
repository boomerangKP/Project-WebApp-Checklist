<script setup>
import { ref } from "vue";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Mail,
  Phone,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Check,
  User,
} from "lucide-vue-next";

const props = defineProps({
  employees: {
    type: Array,
    default: () => [],
  },
  loading: Boolean,
  currentPage: Number,
  totalPages: Number,
  totalItems: Number,
  itemsPerPage: Number,
});

const emit = defineEmits(["edit", "delete", "changePage", "update:itemsPerPage"]);

// State สำหรับจัดการ Effect ตอน Copy
const copiedId = ref(null);

// ฟังก์ชันคัดลอกรหัสพนักงาน
const copyToClipboard = async (text, id) => {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    copiedId.value = id;
    // คืนค่าไอคอนเดิมหลังจาก 2 วินาที
    setTimeout(() => {
      copiedId.value = null;
    }, 2000);
  } catch (err) {
    console.error("Failed to copy:", err);
  }
};

// Helper Functions
const getRoleLabel = (r) => {
  switch (r) {
    case "admin":
      return "ผู้ดูแลระบบ";
    case "maid":
      return "แม่บ้าน";
    default:
      return r || "-";
  }
};

const getRoleStyle = (r) => {
  switch (r) {
    case "admin":
      return "bg-purple-50 text-purple-700 border-purple-100";
    case "maid":
      return "bg-blue-50 text-blue-700 border-blue-100";
    default:
      return "bg-gray-50 text-gray-600 border-gray-200";
  }
};
</script>

<template>
  <div
    class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-260px)] relative"
  >
    <div class="flex-1 overflow-y-auto overflow-x-auto relative custom-scrollbar">
      <table class="w-full text-left border-collapse">
        <thead
          class="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 text-xs text-gray-500 font-semibold uppercase tracking-wider"
        >
          <tr>
            <th class="px-6 py-4 whitespace-nowrap w-40">รหัสพนักงาน</th>
            <th class="px-6 py-4 whitespace-nowrap">พนักงาน</th>
            <th class="px-6 py-4 whitespace-nowrap">ตำแหน่ง</th>
            <th class="px-6 py-4 whitespace-nowrap">เบอร์โทร</th>
            <th class="px-6 py-4 whitespace-nowrap">อีเมล</th>
            <th class="px-6 py-4 whitespace-nowrap">สถานะ</th>
            <th class="px-6 py-4 text-right whitespace-nowrap w-24">จัดการ</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-gray-100 bg-white">
          <tr v-if="loading">
            <td colspan="7" class="px-6 py-20 text-center text-gray-400">
              <div class="flex flex-col items-center justify-center gap-3">
                <Loader2 class="w-8 h-8 animate-spin text-indigo-500" />
                <span>กำลังโหลดข้อมูล...</span>
              </div>
            </td>
          </tr>

          <tr v-else-if="!employees || employees.length === 0">
            <td colspan="7" class="px-6 py-20 text-center text-gray-400 bg-gray-50/30">
              <div class="flex flex-col items-center justify-center gap-2">
                <span class="text-4xl opacity-50">📄</span><span>ไม่พบข้อมูลพนักงาน</span>
              </div>
            </td>
          </tr>

          <tr
            v-else
            v-for="emp in employees"
            :key="emp.employees_id"
            class="hover:bg-gray-50 transition-colors group"
          >
            <td class="px-6 py-4 whitespace-nowrap">
              <div
                @click="copyToClipboard(emp.employees_code, emp.employees_id)"
                class="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-mono text-gray-600 hover:border-indigo-300 hover:text-indigo-600 cursor-pointer transition-all active:scale-95 select-none"
                title="คลิกเพื่อคัดลอก"
              >
                <span>{{ emp.employees_code || "N/A" }}</span>
                <Check
                  v-if="copiedId === emp.employees_id"
                  class="w-3.5 h-3.5 text-green-500"
                />
                <Copy v-else class="w-3.5 h-3.5 opacity-50" />
              </div>
            </td>

            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center gap-3">
                <div
                  class="h-9 w-9 rounded-full bg-gray-100 overflow-hidden border border-gray-200 flex-shrink-0"
                >
                  <img
                    v-if="emp.employees_photo"
                    :src="emp.employees_photo"
                    class="h-full w-full object-cover"
                  />
                  <div
                    v-else
                    class="h-full w-full flex items-center justify-center text-xs font-bold text-gray-400 bg-gray-50"
                  >
                    <User class="w-5 h-5" />
                  </div>
                </div>
                <div class="font-medium text-gray-900 text-sm">
                  {{ emp.employees_firstname }} {{ emp.employees_lastname }}
                </div>
              </div>
            </td>

            <td class="px-6 py-4 whitespace-nowrap">
              <span
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border"
                :class="getRoleStyle(emp.role)"
              >
                {{ getRoleLabel(emp.role) }}
              </span>
            </td>

            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center gap-2.5">
                <Phone class="w-4 h-4 text-gray-400" />
                <span class="text-sm text-gray-600 font-mono tracking-wide">
                  {{ emp.employees_phone || "-" }}
                </span>
              </div>
            </td>

            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center gap-2.5">
                <Mail class="w-4 h-4 text-gray-400" />
                <span
                  class="text-sm text-gray-600 truncate max-w-[180px]"
                  :title="emp.email"
                >
                  {{ emp.email || "-" }}
                </span>
              </div>
            </td>

            <td class="px-6 py-4 whitespace-nowrap">
              <div
                class="flex items-center gap-2 text-sm font-medium"
                :class="
                  emp.employees_status === 'active' ? 'text-emerald-700' : 'text-gray-500'
                "
              >
                <span
                  class="w-2 h-2 rounded-full"
                  :class="
                    emp.employees_status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'
                  "
                ></span>
                {{ emp.employees_status === "active" ? "ปกติ" : "ระงับ" }}
              </div>
            </td>

            <td class="px-6 py-4 text-right whitespace-nowrap">
              <div class="flex items-center justify-end gap-2">
                <button
                  @click="$emit('edit', emp)"
                  class="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors border border-transparent hover:border-indigo-100"
                  title="แก้ไข"
                >
                  <Edit class="w-4 h-4" />
                </button>
                <button
                  @click="$emit('delete', emp)"
                  class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors border border-transparent hover:border-red-100"
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
      class="sticky bottom-0 z-20 bg-white border-t border-gray-200 px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]"
    >
      <div class="flex items-center gap-4 text-sm text-gray-600">
        <span class="whitespace-nowrap">
          แสดง {{ totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0 }} ถึง
          {{ Math.min(currentPage * itemsPerPage, totalItems) }} จาก
          <span class="font-bold text-gray-900">{{ totalItems }}</span> รายการ
        </span>
        <div class="flex items-center gap-2">
          <span class="hidden sm:inline">แสดง:</span>
          <select
            :value="itemsPerPage"
            @change="$emit('update:itemsPerPage', Number($event.target.value))"
            class="border border-gray-300 rounded-md text-sm py-1 px-2 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer bg-white"
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
          type="button"
          @click="$emit('changePage', 1)"
          :disabled="currentPage === 1"
          class="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-500 hover:text-indigo-600 transition-colors"
        >
          <ChevronsLeft class="w-4 h-4" />
        </button>
        <button
          type="button"
          @click="$emit('changePage', currentPage - 1)"
          :disabled="currentPage === 1"
          class="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-500 hover:text-indigo-600 transition-colors"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>
        <span
          class="px-3 py-1.5 text-sm font-bold text-indigo-600 bg-indigo-50 rounded-lg min-w-[32px] text-center select-none border border-indigo-100"
          >{{ currentPage }}</span
        >
        <button
          type="button"
          @click="$emit('changePage', currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-500 hover:text-indigo-600 transition-colors"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
        <button
          type="button"
          @click="$emit('changePage', totalPages)"
          :disabled="currentPage === totalPages"
          class="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-500 hover:text-indigo-600 transition-colors"
        >
          <ChevronsRight class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
</style>
