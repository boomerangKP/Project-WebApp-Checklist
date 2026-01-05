<script setup>
import { Clock, CheckCircle2, AlertTriangle, MapPin, Building, } from "lucide-vue-next";

defineProps({
  activities: { type: Array, default: () => [] },
});

// Helper functions ย้ายมาไว้ที่นี่ เพราะใช้แค่ในนี้
const getStatusBadge = (status) => {
  switch (status) {
    case "pass":
      return {
        color: "bg-green-100 text-green-700",
        text: "เรียบร้อย",
        icon: CheckCircle2,
      };
    case "fail":
      return { color: "bg-red-100 text-red-700", text: "พบปัญหา", icon: AlertTriangle };
    case "fixed":
      return {
        color: "bg-blue-100 text-blue-700",
        text: "แก้ไขแล้ว",
        icon: CheckCircle2,
      };
    case "in_progress":
      return { color: "bg-indigo-100 text-indigo-700", text: "กำลังทำ", icon: Clock };
    default:
      return { color: "bg-yellow-100 text-yellow-700", text: "รอตรวจ", icon: Clock };
  }
};

const formatTime = (timeStr) => {
  if (!timeStr) return "-";
  return timeStr.substring(0, 5);
};
</script>

<template>
  <div
    class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full"
  >
    <h3 class="text-xl font-bold text-gray-800 mb-4">Recent Activity</h3>

    <div class="flex-1 overflow-y-auto pr-2 space-y-4">
      <div
        v-if="activities.length === 0"
        class="h-full flex flex-col items-center justify-center text-gray-400"
      >
        <Clock class="w-10 h-10 mb-2 opacity-20" />
        <p>ยังไม่มีกิจกรรมวันนี้</p>
      </div>

      <div
        v-for="item in activities"
        :key="item.check_sessions_id"
        class="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-100"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border border-gray-200"
          >
            <img
              v-if="item.employees?.employees_photo"
              :src="item.employees.employees_photo"
              class="w-full h-full object-cover"
            />
            <div
              v-else
              class="w-full h-full flex items-center justify-center text-gray-400 font-bold bg-indigo-50 text-indigo-300"
            >
              {{ item.employees?.employees_firstname?.charAt(0) }}
            </div>
          </div>

          <div>
            <p class="text-sm font-bold text-gray-800">
              {{ item.employees?.employees_firstname }}
              {{ item.employees?.employees_lastname }}
            </p>
            <div
              class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-1"
            >
              <div class="flex items-center gap-1">
                <MapPin class="w-3.5 h-3.5 text-indigo-500" />
                <span class="font-bold text-gray-700">{{
                  item.locations?.locations_name
                }}</span>
              </div>

              <span class="text-gray-300 hidden sm:inline">|</span>

              <div class="flex items-center gap-1.5">
                <Building class="w-3.5 h-3.5 text-gray-400" />
                <span> ตึก {{ item.locations?.locations_building }}</span>
                <span
                  class="px-1.5 py-0.5 rounded-md  text-[10px] font-semibold text-gray-600"
                >
                  ชั้น {{ item.locations?.locations_floor }}
                </span>
              </div>

              <span class="text-gray-300 hidden sm:inline">|</span>

              <div class="flex items-center gap-1">
                <Clock class="w-3.5 h-3.5 text-orange-400" />
                <span> ส่งมาเมื่อเวลา {{ formatTime(item.check_sessions_time_start) }} น.</span>
              </div>
            </div>
          </div>
        </div>

        <div
          :class="`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
            getStatusBadge(item.check_sessions_status).color
          }`"
        >
          <component
            :is="getStatusBadge(item.check_sessions_status).icon"
            class="w-3 h-3"
          />
          {{ getStatusBadge(item.check_sessions_status).text }}
        </div>
      </div>
    </div>
  </div>
</template>
