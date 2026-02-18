<script setup>
import { computed } from "vue";
import { LayoutDashboard, Clock, CheckCircle2, Users, Star } from "lucide-vue-next";

const props = defineProps({
  stats: {
    type: Object,
    required: true,
    default: () => ({
      total: 0,
      pending: 0,
      completed: 0,
      activeStaff: 0,
      todayReviews: 0,
      averageRating: 0,
    }),
  },
});

// คำนวณ % ความสำเร็จ
const completionRate = computed(() => {
  if (!props.stats.total || props.stats.total === 0) return 0;
  return Math.round((props.stats.completed / props.stats.total) * 100);
});

// คำนวณ % งานที่ค้างอยู่
const pendingRate = computed(() => {
  if (!props.stats.total || props.stats.total === 0) return 0;
  return Math.round((props.stats.pending / props.stats.total) * 100);
});
</script>

<template>
  <div class="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
    
    <div
      class="bg-white dark:bg-slate-800 p-3 sm:p-5 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex items-start justify-between transition-colors duration-300"
    >
      <div>
        <div class="flex items-center gap-2 mb-2">
          <div
            class="p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400"
          >
            <LayoutDashboard class="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span class="text-xs sm:text-sm font-medium text-gray-500 dark:text-slate-400"
            >งานทั้งหมด</span
          >
        </div>
        <div class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          {{ stats.total }}
        </div>
        <div class="text-[10px] sm:text-xs text-gray-400 dark:text-slate-500 mt-1 truncate">
          เป้าหมายวันนี้
        </div>
      </div>
    </div>

    <div
      class="bg-white dark:bg-slate-800 p-3 sm:p-5 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex items-start justify-between transition-colors duration-300"
    >
      <div>
        <div class="flex items-center gap-2 mb-2">
          <div
            class="p-1.5 sm:p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-yellow-600 dark:text-yellow-400"
          >
            <Clock class="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span class="text-xs sm:text-sm font-medium text-gray-500 dark:text-slate-400"
            >รอตรวจ</span
          >
        </div>
        <div class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          {{ stats.pending }}
        </div>
        <div class="text-[10px] sm:text-xs text-orange-500 dark:text-orange-400 mt-1 truncate">
          • เหลือ {{ pendingRate }}%
        </div>
      </div>
    </div>

    <div
      class="bg-white dark:bg-slate-800 p-3 sm:p-5 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex items-start justify-between transition-colors duration-300"
    >
      <div>
        <div class="flex items-center gap-2 mb-2">
          <div
            class="p-1.5 sm:p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400"
          >
            <CheckCircle2 class="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span class="text-xs sm:text-sm font-medium text-gray-500 dark:text-slate-400"
            >เสร็จแล้ว</span
          >
        </div>
        <div class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          {{ stats.completed }}
        </div>
        <div class="text-[10px] sm:text-xs text-green-600 dark:text-green-400 mt-1 truncate">
          ▲ เสร็จ {{ completionRate }}%
        </div>
      </div>
    </div>

    <div
      class="bg-white dark:bg-slate-800 p-3 sm:p-5 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex items-start justify-between transition-colors duration-300"
    >
      <div>
        <div class="flex items-center gap-2 mb-2">
          <div
            class="p-1.5 sm:p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400"
          >
            <Users class="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span class="text-xs sm:text-sm font-medium text-gray-500 dark:text-slate-400"
            >พนักงาน</span
          >
        </div>
        <div class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          {{ stats.activeStaff }}
        </div>
        <div class="text-[10px] sm:text-xs text-indigo-600 dark:text-indigo-400 mt-1 truncate">
          • กำลังทำงาน
        </div>
      </div>
    </div>

    <div
      class="col-span-2 md:col-span-1 bg-white dark:bg-slate-800 p-3 sm:p-5 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex items-start justify-between transition-colors duration-300"
    >
      <div class="w-full">
        <div class="flex items-center gap-2 mb-2">
          <div
            class="p-1.5 sm:p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400"
          >
            <Star class="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span class="text-xs sm:text-sm font-medium text-gray-500 dark:text-slate-400"
            >รีวิววันนี้</span
          >
        </div>
        <div class="flex items-end gap-2 justify-between w-full">
           <div class="flex items-end gap-2">
              <div class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {{ stats.todayReviews }}
              </div>
              <span class="text-[10px] sm:text-xs text-gray-400 dark:text-slate-500 mb-1">ครั้ง</span>
           </div>

            <div
              class="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-full"
            >
              <span>★ {{ stats.averageRating }}</span>
              <span class="font-normal text-amber-600/70 dark:text-amber-400/70 hidden sm:inline">เฉลี่ย</span>
            </div>
        </div>
      </div>
    </div>

  </div>
</template>
