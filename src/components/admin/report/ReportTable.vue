<script setup>
import { ref, computed, watch } from "vue";
import {
  Loader2,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Clock,
  Check,
  Copy,
  Building,
  Layers,
  MapPin,
  Calendar,
  // ✅ เพิ่มไอคอน Role
  ShieldCheck,
  SprayCan,
  User 
} from "lucide-vue-next";

const props = defineProps(["logs", "loading"]);
const emit = defineEmits(["view"]); // ตัด update:search ออก เพราะเราทำค้นหาในนี้เลย

// --- Pagination & Search State ---
const currentPage = ref(1);
const itemsPerPage = ref(10);
const copiedId = ref(null);
const searchQuery = ref(""); // ✅ เพิ่มตัวแปรเก็บคำค้นหา

// รีเซ็ตหน้าเมื่อข้อมูลเปลี่ยน
watch(() => props.logs, () => { currentPage.value = 1; });

// ✅ รีเซ็ตหน้าเมื่อมีการพิมพ์ค้นหา
watch(searchQuery, () => { currentPage.value = 1; });

// --- ✅ Computed Logic: การค้นหา (Filter) ---
const filteredLogs = computed(() => {
  if (!props.logs) return [];
  const query = searchQuery.value.toLowerCase().trim();
  
  if (!query) return props.logs; // ถ้าไม่มีคำค้นหา ส่งข้อมูลทั้งหมดกลับไป

  return props.logs.filter((log) => {
    // 1. ค้นหาจาก รหัสงาน (ทั้งตัวเลขเพียวๆ และแบบมี 0 นำหน้า)
    const rawId = log.check_sessions_id?.toString() || "";
    const paddedId = rawId.padStart(6, "0");
    const matchId = rawId.includes(query) || paddedId.includes(query);

    // 2. ค้นหาจาก ชื่อพนักงาน
    const matchName = log.employees?.employees_firstname?.toLowerCase().includes(query);

    // 3. ค้นหาจาก สถานที่
    const matchLocation = log.locations?.locations_name?.toLowerCase().includes(query);

    // 4. ค้นหาจาก อาคาร
    const matchBuilding = log.locations?.locations_building?.toLowerCase().includes(query);

    return matchId || matchName || matchLocation || matchBuilding;
  });
});

// --- Computed Logic: การแบ่งหน้า (ใช้ filteredLogs แทน props.logs) ---
const totalPages = computed(
  () => Math.ceil((filteredLogs.value.length || 0) / itemsPerPage.value) || 1
);

const paginatedLogs = computed(() => {
  if (!filteredLogs.value) return [];
  const start = (currentPage.value - 1) * itemsPerPage.value;
  return filteredLogs.value.slice(start, start + itemsPerPage.value);
});

const startEntry = computed(() =>
  filteredLogs.value.length === 0 ? 0 : (currentPage.value - 1) * itemsPerPage.value + 1
);

const endEntry = computed(() =>
  Math.min(currentPage.value * itemsPerPage.value, filteredLogs.value.length || 0)
);

// --- Helpers (คงเดิมทุกอย่าง) ---
const changePage = (p) => {
  if (p >= 1 && p <= totalPages.value) currentPage.value = p;
};

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        calendar: "buddhist",
      })
    : "-";

const formatTime = (d) =>
  d
    ? new Date(d).toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
      }) + " น."
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
    approved: "ตรวจแล้ว",
    fixed: "แก้ไขแล้ว",
    fail: "พบปัญหา",
    rejected: "ปฏิเสธ",
    waiting: "รอตรวจ",
  }[s] || s);

const copyJobId = async (id) => {
  try {
    await navigator.clipboard.writeText(`${id.toString().padStart(6, "0")}`);
    copiedId.value = id;
    setTimeout(() => (copiedId.value = null), 2000);
  } catch (e) {}
};

// ✅ Helper: Role Config (Icon/Emoji)
const getRoleConfig = (role) => {
  const r = role ? role.toLowerCase() : 'user';
  switch (r) {
    case 'admin':
      return { type: 'icon', icon: ShieldCheck, class: 'bg-purple-100 text-purple-600 border-purple-200' };
    case 'maid':
      return { type: 'icon', icon: SprayCan, class: 'bg-rose-100 text-rose-600 border-rose-200' };
    case 'cleaner':
      // ✅ Emoji 🧹 พื้นหลังสีเทา
      return { type: 'emoji', icon: '🧹', class: 'bg-gray-200 text-base border-transparent' };
    default:
      return { type: 'icon', icon: User, class: 'bg-gray-100 text-gray-500 border-gray-200' };
  }
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
          v-model="searchQuery"
          type="text"
          placeholder="ค้นหา รหัส, ชื่อ, สถานที่..."
          class="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <Search
          class="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2"
        />
      </div>
    </div>

    <div class="flex-1 overflow-auto custom-scrollbar">
      <table class="w-full text-left border-collapse min-w-[1100px]">
        <thead
          class="sticky top-0 z-10 bg-gray-50/95 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider backdrop-blur-sm shadow-sm"
        >
          <tr>
            <th class="px-4 py-2.5 font-medium whitespace-nowrap w-[120px]">รหัสงาน</th>
            <th class="px-4 py-2.5 font-medium whitespace-nowrap">วันที่</th>
            <th class="px-4 py-2.5 font-medium whitespace-nowrap text-center">เวลา</th>
            <th class="px-4 py-2.5 font-medium whitespace-nowrap">พนักงาน</th>
            <th class="px-4 py-2.5 font-medium whitespace-nowrap">ชื่อจุดตรวจ</th>
            <th class="px-4 py-2.5 font-medium whitespace-nowrap text-center">อาคาร</th>
            <th class="px-4 py-2.5 font-medium whitespace-nowrap text-center">ชั้น</th>
            <th class="px-4 py-2.5 font-medium text-center whitespace-nowrap">สถานะ</th>
            <th class="px-4 py-2.5 font-medium text-right whitespace-nowrap">จัดการ</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-gray-100 bg-white text-sm">
          <tr v-if="loading">
            <td colspan="9" class="px-6 py-10 text-center text-gray-400">
              <Loader2 class="w-6 h-6 animate-spin mx-auto mb-2" />กำลังโหลด...
            </td>
          </tr>
          <tr v-else-if="paginatedLogs.length === 0">
            <td colspan="9" class="px-6 py-10 text-center text-gray-400">ไม่พบข้อมูล</td>
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
                <Calendar class="w-3.5 h-3.5 text-gray-400" />
                {{ formatDate(log.created_at) }}
              </div>
            </td>

            <td class="px-4 py-2.5 text-center">
              <div class="inline-flex items-center gap-1.5  px-2 py-1 text-gray-600">
                 <Clock class="w-3 h-3 text-indigo-400" />
                 <span class="font-mono text-xs font-medium">{{ formatTime(log.created_at) }}</span>
              </div>
            </td>

            <td class="px-4 py-2.5">
              <div class="flex items-center gap-2">
                
                <div class="w-7 h-7 rounded-full overflow-hidden border flex-shrink-0">
                   <img
                    v-if="log.employees?.employees_photo"
                    :src="log.employees.employees_photo"
                    class="w-full h-full object-cover"
                   />
                   
                   <div
                    v-else
                    class="w-full h-full flex items-center justify-center border"
                    :class="getRoleConfig(log.employees?.role).class"
                   >
                     <span v-if="getRoleConfig(log.employees?.role).type === 'emoji'" class="leading-none pt-0.5">
                        {{ getRoleConfig(log.employees?.role).icon }}
                     </span>
                     <component v-else :is="getRoleConfig(log.employees?.role).icon" class="w-4 h-4" />
                   </div>
                </div>

                <span class="font-medium text-gray-900">{{
                  log.employees?.employees_firstname
                }}</span>
              </div>
            </td>

            <td class="px-4 py-2.5">
              <div class="flex flex-col">
                <span class="font-medium text-gray-900 flex items-center gap-1.5">
                  <MapPin class="w-3.5 h-3.5 text-indigo-500" />
                  {{ log.locations?.locations_name }}
                </span>
                <span v-if="log.restroom_types?.restroom_types_name" class="text-xs text-gray-500 pl-5">
                    {{ log.restroom_types?.restroom_types_name }}
                </span>
              </div>
            </td>

            <td class="px-4 py-2.5 text-center">
                <div class="inline-flex items-center gap-1.5 text-gray-700  px-2 py-1 ">
                  
                  <span class="font-medium">{{ log.locations?.locations_building || '-' }}</span>
                </div>
            </td>

            <td class="px-4 py-2.5 text-center">
                <div class="inline-flex items-center justify-center min-w-[30px] h-[24px] text-gray-700 text-xs font-bold">
                  {{ log.locations?.locations_floor || '-' }}
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
        <span>แสดง {{ startEntry }} ถึง {{ endEntry }} จาก {{ filteredLogs.length }}</span>
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