<script setup>
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Building,
  ChevronRight,
  UserCheck,
  ShieldCheck,
  SprayCan,
  User,
} from "lucide-vue-next";

defineProps({
  activities: { type: Array, default: () => [] },
});

defineEmits(["click"]);

// Helper functions: Status
const getStatusBadge = (status) => {
  switch (status) {
    case "pass":
    case "approved":
      // ✅ แก้: เพิ่ม dark mode colors
      return {
        color:
          "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800",
        text: "ตรวจแล้ว",
        icon: CheckCircle2,
      };
    case "fail":
    case "rejected":
      return {
        color:
          "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
        text: "ส่งแก้ไข",
        icon: AlertTriangle,
      };
    case "fixed":
      return {
        color:
          "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
        text: "แก้ไขแล้ว",
        icon: CheckCircle2,
      };
    case "in_progress":
      return {
        color:
          "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800",
        text: "กำลังทำ",
        icon: Clock,
      };
    default:
      return {
        color:
          "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
        text: "รอตรวจ",
        icon: Clock,
      };
  }
};

const formatTime = (timeStr) => {
  if (!timeStr) return "-";
  return timeStr.substring(0, 5);
};

// ✅ Helper: Config ตาม Role (จัดให้ตามคำขอ)
const getRoleConfig = (role) => {
  const r = role ? role.toLowerCase() : "user";
  switch (r) {
    case "admin":
      // ✅ แก้: เพิ่ม dark mode colors
      return {
        type: "icon",
        icon: ShieldCheck,
        class:
          "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800",
      };
    case "maid":
      return {
        type: "icon",
        icon: SprayCan,
        class:
          "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800",
      };
    case "cleaner":
      // ✅ จัดให้ตามคำขอ: bg-gray-200 และ text-xl (เพิ่ม dark mode)
      return { type: "emoji", icon: "🧹", class: "bg-gray-200 dark:bg-gray-700 text-xl" };
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
  <div class="flex flex-col h-full w-full">
    <div class="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
      <div
        v-if="activities.length === 0"
        class="h-full flex flex-col items-center justify-center text-gray-400 dark:text-slate-500 min-h-[150px]"
      >
        <Clock class="w-12 h-12 mb-3 opacity-10" />
        <p class="text-sm">ยังไม่มีความเคลื่อนไหววันนี้</p>
      </div>

      <div
        v-for="item in activities"
        :key="item.check_sessions_id"
        @click="$emit('click', item)"
        class="group flex items-center justify-between p-3.5 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-2xl transition-all border border-transparent hover:border-gray-200 dark:hover:border-slate-700 cursor-pointer"
      >
        <div class="flex items-center gap-4">
          <div class="relative flex-shrink-0">
            <div
              class="w-12 h-12 rounded-full overflow-hidden shadow-sm border border-transparent dark:border-slate-700"
            >
              <img
                v-if="item.employees?.employees_photo"
                :src="item.employees.employees_photo"
                class="w-full h-full object-cover"
              />

              <div
                v-else
                class="w-full h-full flex items-center justify-center border dark:border-slate-600"
                :class="getRoleConfig(item.employees?.role).class"
              >
                <span
                  v-if="getRoleConfig(item.employees?.role).type === 'emoji'"
                  class="leading-none pt-1"
                >
                  {{ getRoleConfig(item.employees?.role).icon }}
                </span>

                <component
                  v-else
                  :is="getRoleConfig(item.employees?.role).icon"
                  class="w-6 h-6"
                />
              </div>
            </div>
          </div>

          <div class="min-w-0">
            <p
              class="text-sm font-bold text-gray-900 dark:text-white leading-tight truncate"
            >
              {{ item.employees?.employees_firstname }}
              {{ item.employees?.employees_lastname }}
            </p>

            <div
              class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-slate-400 mt-1.5"
            >
              <div class="flex items-center gap-1 text-gray-700 dark:text-slate-300">
                <MapPin
                  class="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0"
                />
                <span class="font-medium truncate max-w-[100px] sm:max-w-[150px]">{{
                  item.locations?.locations_name
                }}</span>
              </div>
              <div
                class="flex items-center gap-1 text-gray-400 dark:text-slate-500 whitespace-nowrap"
              >
                <Building class="w-3.5 h-3.5" />
                <span>
                  อาคาร {{ item.locations?.locations_building }} ชั้น
                  {{ item.locations?.locations_floor }}
                </span>
              </div>
              <div
                class="flex items-center gap-1 text-gray-400 dark:text-slate-500 whitespace-nowrap"
              >
                <Clock class="w-3 h-3" />
                <span>ส่งเมื่อ: {{ formatTime(item.check_sessions_time_start) }} น.</span>
              </div>

              <div
                v-if="item.checked_at"
                class="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium whitespace-nowrap"
              >
                <UserCheck class="w-3 h-3" />
                <span
                  >ตรวจเมื่อ:
                  {{ formatTime(new Date(item.checked_at).toTimeString()) }} น.</span
                >
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-3 pl-2">
          <div
            :class="`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5 border whitespace-nowrap ${
              getStatusBadge(item.check_sessions_status).color
            }`"
          >
            <component
              :is="getStatusBadge(item.check_sessions_status).icon"
              class="w-3 h-3"
            />
            <span class="hidden sm:inline">{{
              getStatusBadge(item.check_sessions_status).text
            }}</span>
            <span class="sm:hidden" v-if="item.check_sessions_status === 'waiting'"
              >รอ</span
            >
          </div>

          <ChevronRight
            class="w-4 h-4 text-gray-300 dark:text-slate-600 group-hover:text-gray-600 dark:group-hover:text-slate-400 transition-colors flex-shrink-0"
          />
        </div>
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
  background: #e2e8f0;
  border-radius: 20px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}

/* Dark Mode Scrollbar */
:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
  background: #475569;
}
:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}
</style>
