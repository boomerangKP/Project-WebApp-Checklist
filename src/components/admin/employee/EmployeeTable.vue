<script setup>
import { ref } from "vue";
import {
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
  // ✅ เพิ่มไอคอน Role
  ShieldCheck,
  SprayCan,
} from "lucide-vue-next";

defineProps({
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

defineEmits(["edit", "delete", "changePage", "update:itemsPerPage"]);

// State สำหรับจัดการ Effect ตอน Copy
const copiedId = ref(null);

const copyToClipboard = async (text, id) => {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    copiedId.value = id;
    setTimeout(() => {
      copiedId.value = null;
    }, 2000);
  } catch (err) {
    console.error("Failed to copy:", err);
  }
};

// ✅ Helper: ย่อรูปให้โหลดไว (Table ใช้รูปเล็กๆ แค่ 80px ก็ชัดแล้ว)
const getOptimizedPhoto = (url) => {
  if (!url) return "";
  if (url.includes('base64')) return url;
  return `${url}?width=80&height=80&resize=cover`;
};

// Helper: Role (ตำแหน่ง)
const getRoleLabel = (r) => {
  if (!r) return "-";
  switch (r.toLowerCase()) {
    case "admin":
      return "ผู้ดูแลระบบ";
    case "maid":
      return "แม่บ้าน";
    case "user":
      return "พนักงานทั่วไป";
    case "cleaner":
      return "พนักงานทำความสะอาด";
    case "supervisor":
      return "หัวหน้างาน";
    default:
      return r || "-";
  }
};

const getRoleStyle = (r) => {
  if (!r)
    return "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700";
  switch (r.toLowerCase()) {
    // ✅ เพิ่ม Dark Mode Colors ให้ Badge
    case "admin":
      return "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-100 dark:border-purple-800";
    case "maid":
      return "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-800";
    case "user":
      return "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800";
    case "cleaner":
      return "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 border-cyan-100 dark:border-cyan-800";
    case "supervisor":
      return "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-800";
    default:
      return "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700";
  }
};

// Helper: Status (สถานะ)
const getStatusConfig = (status) => {
  switch (status) {
    case "active":
      return {
        label: "ปกติ",
        textClass: "text-emerald-700 dark:text-emerald-400",
        dotClass: "bg-emerald-500",
      };
    case "inactive":
      return {
        label: "ไม่เคลื่อนไหว",
        textClass: "text-slate-500 dark:text-slate-400",
        dotClass: "bg-slate-400",
      };
    case "suspended":
      return {
        label: "ระงับ",
        textClass: "text-red-600 dark:text-red-400",
        dotClass: "bg-red-500",
      };
    default:
      return {
        label: status || "-",
        textClass: "text-gray-500 dark:text-gray-400",
        dotClass: "bg-gray-300",
      };
  }
};

// ✅ Helper: Role Config (Icon/Emoji)
const getRoleConfig = (role) => {
  const r = role ? role.toLowerCase() : "user";
  switch (r) {
    case "admin":
      return {
        type: "icon",
        icon: ShieldCheck,
        class:
          "bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800",
      };
    case "maid":
      return {
        type: "icon",
        icon: SprayCan,
        class:
          "bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800",
      };
    case "cleaner":
      // ✅ Emoji 🧹 พื้นหลังสีเทา
      return {
        type: "emoji",
        icon: "🧹",
        class: "bg-gray-200 dark:bg-gray-700 text-lg border-transparent",
      };
    default:
      return {
        type: "icon",
        icon: User,
        class:
          "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700",
      };
  }
};
</script>

<template>
  <div
    class="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-260px)] relative transition-colors duration-300"
  >
    <div class="flex-1 overflow-y-auto overflow-x-auto relative custom-scrollbar">
      <table class="w-full text-left border-collapse">
        <thead
          class="sticky top-0 z-10 bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider"
        >
          <tr>
            <th class="px-5 py-4 whitespace-nowrap w-40">รหัสพนักงาน</th>
            <th class="px-5 py-4 whitespace-nowrap">พนักงาน</th>
            <th class="px-5 py-4 whitespace-nowrap">ตำแหน่ง</th>
            <th class="px-5 py-4 whitespace-nowrap">เบอร์โทร</th>
            <th class="px-5 py-4 whitespace-nowrap">อีเมล</th>
            <th class="px-5 py-4 whitespace-nowrap">สถานะ</th>
            <th class="px-5 py-4 text-right whitespace-nowrap w-24">จัดการ</th>
          </tr>
        </thead>

        <tbody
          class="divide-y divide-gray-100 dark:divide-slate-700 bg-white dark:bg-slate-800"
        >
          <tr v-if="loading">
            <td
              colspan="7"
              class="px-6 py-20 text-center text-gray-400 dark:text-slate-500"
            >
              <div class="flex flex-col items-center justify-center gap-3">
                <Loader2
                  class="w-8 h-8 animate-spin text-indigo-500 dark:text-indigo-400"
                />
                <span>กำลังโหลดข้อมูล...</span>
              </div>
            </td>
          </tr>

          <tr v-else-if="!employees || employees.length === 0">
            <td
              colspan="7"
              class="px-6 py-20 text-center text-gray-400 dark:text-slate-500 bg-gray-50/30 dark:bg-slate-800/30"
            >
              <div class="flex flex-col items-center justify-center gap-2">
                <span class="text-4xl opacity-50">📄</span><span>ไม่พบข้อมูลพนักงาน</span>
              </div>
            </td>
          </tr>

          <tr
            v-else
            v-for="emp in employees"
            :key="emp.employees_id"
            class="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors group"
          >
            <td class="px-6 py-4 whitespace-nowrap">
              <div
                @click="copyToClipboard(emp.employees_code, emp.employees_id)"
                class="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs font-mono text-gray-600 dark:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-all active:scale-95 select-none"
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
                  class="h-9 w-9 rounded-full overflow-hidden border border-gray-200 dark:border-slate-600 flex-shrink-0"
                >
                  <img
                    v-if="emp.employees_photo"
                    :src="getOptimizedPhoto(emp.employees_photo)"
                    class="h-full w-full object-cover"
                  />

                  <div
                    v-else
                    class="h-full w-full flex items-center justify-center border dark:border-slate-600"
                    :class="getRoleConfig(emp.role).class"
                  >
                    <span
                      v-if="getRoleConfig(emp.role).type === 'emoji'"
                      class="leading-none pt-0.5 text-base"
                    >
                      {{ getRoleConfig(emp.role).icon }}
                    </span>
                    <component
                      v-else
                      :is="getRoleConfig(emp.role).icon"
                      class="w-5 h-5"
                    />
                  </div>
                </div>
                <div class="font-medium text-gray-900 dark:text-white text-sm">
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
                <Phone class="w-4 h-4 text-gray-400 dark:text-slate-500" />
                <span
                  class="text-sm text-gray-600 dark:text-slate-300 font-mono tracking-wide"
                >
                  {{ emp.employees_phone || "-" }}
                </span>
              </div>
            </td>

            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center gap-2.5">
                <Mail class="w-4 h-4 text-gray-400 dark:text-slate-500" />
                <span
                  class="text-sm text-gray-600 dark:text-slate-300 truncate max-w-[180px]"
                  :title="emp.email"
                >
                  {{ emp.email || "-" }}
                </span>
              </div>
            </td>

            <td class="px-6 py-4 whitespace-nowrap">
              <div
                class="flex items-center gap-2 text-sm font-medium"
                :class="getStatusConfig(emp.employees_status).textClass"
              >
                <span
                  class="w-2 h-2 rounded-full"
                  :class="getStatusConfig(emp.employees_status).dotClass"
                ></span>
                {{ getStatusConfig(emp.employees_status).label }}
              </div>
            </td>

            <td class="px-6 py-4 text-right whitespace-nowrap">
              <div class="flex items-center justify-end gap-2">
                <button
                  @click="$emit('edit', emp)"
                  class="p-1.5 text-gray-400 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-colors border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800"
                  title="แก้ไข"
                >
                  <Edit class="w-4 h-4" />
                </button>
                <button
                  @click="$emit('delete', emp)"
                  class="p-1.5 text-gray-400 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-800"
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
      class="sticky bottom-0 z-20 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] transition-colors"
    >
      <div class="flex items-center gap-4 text-sm text-gray-600 dark:text-slate-400">
        <span class="whitespace-nowrap">
          แสดง {{ totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0 }} ถึง
          {{ Math.min(currentPage * itemsPerPage, totalItems) }} จาก
          <span class="font-bold text-gray-900 dark:text-white">{{ totalItems }}</span>
          รายการ
        </span>
        <div class="flex items-center gap-2">
          <span class="hidden sm:inline">แสดง:</span>
          <select
            :value="itemsPerPage"
            @change="$emit('update:itemsPerPage', Number($event.target.value))"
            class="border border-gray-300 dark:border-slate-600 rounded-md text-sm py-1 px-2 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer bg-white dark:bg-slate-700 dark:text-white"
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
          class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <ChevronsLeft class="w-4 h-4" />
        </button>
        <button
          type="button"
          @click="$emit('changePage', currentPage - 1)"
          :disabled="currentPage === 1"
          class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>

        <span
          class="px-3 py-1.5 text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg min-w-[32px] text-center select-none border border-indigo-100 dark:border-indigo-800"
          >{{ currentPage }}</span
        >

        <button
          type="button"
          @click="$emit('changePage', currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
        <button
          type="button"
          @click="$emit('changePage', totalPages)"
          :disabled="currentPage === totalPages"
          class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
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

/* ✅ Dark Mode Scrollbar */
:global(.dark) .custom-scrollbar::-webkit-scrollbar-track {
  background: #1e293b; /* slate-800 */
}
:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
  background: #475569; /* slate-600 */
}
:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #64748b; /* slate-500 */
}
</style>