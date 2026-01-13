<script setup>
import { Clock, CheckCircle2, AlertTriangle, MapPin, Building, ChevronRight, UserCheck } from "lucide-vue-next";

defineProps({
  activities: { type: Array, default: () => [] },
});

defineEmits(['click']);

// Helper functions
const getStatusBadge = (status) => {
  switch (status) {
    case "pass":
    case "approved":
      return {
        color: "bg-green-100 text-green-700 border-green-200",
        text: "ตรวจแล้ว",
        icon: CheckCircle2,
      };
    case "fail":
    case "rejected":
      return {
        color: "bg-red-100 text-red-700 border-red-200",
        text: "ส่งแก้ไข",
        icon: AlertTriangle
      };
    case "fixed":
      return {
        color: "bg-blue-100 text-blue-700 border-blue-200",
        text: "แก้ไขแล้ว",
        icon: CheckCircle2,
      };
    case "in_progress":
      return { color: "bg-indigo-100 text-indigo-700 border-indigo-200", text: "กำลังทำ", icon: Clock };
    default: // waiting
      return { color: "bg-yellow-100 text-yellow-700 border-yellow-200", text: "รอตรวจ", icon: Clock };
  }
};

const formatTime = (timeStr) => {
  if (!timeStr) return "-";
  return timeStr.substring(0, 5);
};
</script>

<template>
  <div class="flex flex-col h-full w-full">

    <div class="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">

      <div
        v-if="activities.length === 0"
        class="h-full flex flex-col items-center justify-center text-gray-400 min-h-[150px]"
      >
        <Clock class="w-12 h-12 mb-3 opacity-10" />
        <p class="text-sm">ยังไม่มีความเคลื่อนไหววันนี้</p>
      </div>

      <div
        v-for="item in activities"
        :key="item.check_sessions_id"
        @click="$emit('click', item)"
        class="group flex items-center justify-between p-3.5 hover:bg-gray-50 rounded-2xl transition-all border border-transparent hover:border-gray-200 cursor-pointer"
      >
        <div class="flex items-center gap-4">
          <div class="relative flex-shrink-0">
            <div class="w-11 h-11 rounded-full bg-gray-50 overflow-hidden border border-gray-100">
                <img
                v-if="item.employees?.employees_photo"
                :src="item.employees.employees_photo"
                class="w-full h-full object-cover"
                />
                <div
                v-else
                class="w-full h-full flex items-center justify-center text-gray-400 font-bold bg-indigo-50 text-indigo-400"
                >
                {{ item.employees?.employees_firstname?.charAt(0) }}
                </div>
            </div>
          </div>

          <div class="min-w-0"> <p class="text-sm font-bold text-gray-900 leading-tight truncate">
              {{ item.employees?.employees_firstname }} {{ item.employees?.employees_lastname }}
            </p>

            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-1.5">

              <div class="flex items-center gap-1 text-gray-700">
                <MapPin class="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span class="font-medium truncate max-w-[100px] sm:max-w-[150px]">{{ item.locations?.locations_name }}</span>
              </div>
              <div class="flex items-center gap-1 text-gray-400 whitespace-nowrap">
                <Building class="w-3.5 h-3.5 " />
                <span>
                  อาคาร {{ item.locations?.locations_building }} ชั้น {{ item.locations?.locations_floor }}
                </span>
              </div>
              <div class="flex items-center gap-1 text-gray-400 whitespace-nowrap">
                 <Clock class="w-3 h-3" />
                 <span>ส่งเมื่อ: {{ formatTime(item.check_sessions_time_start) }} น.</span>
              </div>

              <div v-if="item.checked_at" class="flex items-center gap-1 text-indigo-600 font-medium whitespace-nowrap">
                 <UserCheck class="w-3 h-3" />
                 <span>ตรวจเมื่อ: {{ formatTime(new Date(item.checked_at).toTimeString()) }} น.</span>
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
            <span class="hidden sm:inline">{{ getStatusBadge(item.check_sessions_status).text }}</span> <span class="sm:hidden" v-if="item.check_sessions_status === 'waiting'">รอ</span> </div>

            <ChevronRight class="w-4 h-4 text-gray-300 group-hover:text-gray-600 transition-colors flex-shrink-0" />
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
</style>
