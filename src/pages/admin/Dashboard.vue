<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "@/lib/supabase";
import {
  Loader2,
  Building,
  BarChart3,
  RefreshCw,
  TrendingUp,
  Filter,
  ChevronDown,
  Check,
  Calendar, // ✅ มี Calendar แล้วถูกต้องครับ
} from "lucide-vue-next";

// Components
import StatsCards from "@/components/admin/dashboard/StatsCards.vue";
import TaskTrendsChart from "@/components/admin/dashboard/TaskTrendsChart.vue";
import RecentActivityList from "@/components/admin/dashboard/RecentActivityList.vue";

const router = useRouter();

// --- State ---
const loading = ref(true);
const isRefreshing = ref(false);
const realtimeChannel = ref(null);

// --- Filter State ---
const selectedBuilding = ref("ทั้งหมด");
const uniqueBuildings = ref([]);

// --- Custom Dropdown State ---
const isBuildingDropdownOpen = ref(false);

// ข้อมูลดิบ (Raw Data)
const rawSessions = ref([]);
const rawLocations = ref([]);
const rawFeedbacks = ref([]);

// ข้อมูลที่จะนำไปแสดงผล (Reactive)
const stats = ref({
  total: 0,
  pending: 0,
  completed: 0,
  activeStaff: 0,
  todayReviews: 0,
  averageRating: 0,
});
const recentActivities = ref([]);
const chartData = ref({ labels: [], datasets: [] });

// --- Chart Configuration ---
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: "top",
      labels: {
        usePointStyle: true,
        boxWidth: 8,
        font: { family: "'Noto Sans Thai', sans-serif" },
      },
    },
  },
  layout: { padding: { bottom: 20, left: 10, right: 10, top: 10 } },
  scales: {
    y: {
      beginAtZero: true,
      grid: { color: "#f3f4f6" },
      ticks: { precision: 0, font: { family: "'Noto Sans Thai', sans-serif" } },
    },
    x: {
      grid: { display: false },
      ticks: { font: { family: "'Noto Sans Thai', sans-serif" } },
    },
  },
};

// --- Helpers ---
const getTodayDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getProgressColor = (percent) => {
  if (percent === 100) return "bg-emerald-500";
  if (percent >= 50) return "bg-blue-500";
  return "bg-amber-500";
};

const goToDetail = (item) => {
  if (item && item.check_sessions_id) {
    router.push(`/admin/check/${item.check_sessions_id}`);
  }
};

// --- Logic Custom Dropdown ---
const toggleBuildingDropdown = () => {
  isBuildingDropdownOpen.value = !isBuildingDropdownOpen.value;
};

const selectBuilding = (val) => {
  selectedBuilding.value = val;
  isBuildingDropdownOpen.value = false;
};

const handleClickOutside = (e) => {
  if (!e.target.closest(".custom-dropdown-container")) {
    isBuildingDropdownOpen.value = false;
  }
};

// --- Logic คำนวณข้อมูลตาม Filter ---
const calculateDashboardData = () => {
  let filteredLocations = rawLocations.value;
  let filteredSessions = rawSessions.value;

  if (selectedBuilding.value !== "ทั้งหมด") {
    filteredLocations = rawLocations.value.filter(
      (l) => l.locations_building === selectedBuilding.value
    );
    filteredSessions = rawSessions.value.filter(
      (s) => s.locations.locations_building === selectedBuilding.value
    );
  }

  const targetPerShift = filteredLocations.length;

  const morningSessions = filteredSessions.filter(
    (s) => new Date(s.created_at).getHours() < 12
  );
  const afternoonSessions = filteredSessions.filter(
    (s) => new Date(s.created_at).getHours() >= 12
  );

  const calculateShiftStats = (shiftSessions, targetCount) => {
    const completedIds = new Set(
      shiftSessions
        .filter((s) => ["pass", "fixed", "approved"].includes(s.check_sessions_status))
        .map((s) => s.locations_id)
    );
    const completed = completedIds.size;
    const problem = shiftSessions.filter((s) =>
      ["fail", "rejected"].includes(s.check_sessions_status)
    ).length;
    const pending = Math.max(0, targetCount - completed);
    return { completed, problem, pending };
  };

  const morningStats = calculateShiftStats(morningSessions, targetPerShift);
  const afternoonStats = calculateShiftStats(afternoonSessions, targetPerShift);

  const totalDailyTarget = targetPerShift;
  const totalCompleted = morningStats.completed + afternoonStats.completed;
  const totalPending = Math.max(0, totalDailyTarget - totalCompleted);
  const uniqueStaff = new Set(filteredSessions.map((s) => s.employees_id)).size;

  let reviewsCount = 0;
  let avgRating = 0;
  if (rawFeedbacks.value.length > 0) {
    reviewsCount = rawFeedbacks.value.length;
    const sumRating = rawFeedbacks.value.reduce((acc, curr) => acc + curr.rating, 0);
    avgRating = (sumRating / reviewsCount).toFixed(1);
  }

  stats.value = {
    total: totalDailyTarget,
    pending: totalPending,
    completed: totalCompleted,
    activeStaff: uniqueStaff,
    todayReviews: reviewsCount,
    averageRating: avgRating,
  };

  chartData.value = {
    labels: ["รอตรวจสอบ", "เรียบร้อย", "พบปัญหา"],
    datasets: [
      {
        label: "รอบเช้า",
        data: [morningStats.pending, morningStats.completed, morningStats.problem],
        backgroundColor: "#3b82f6",
        borderRadius: 4,
        barPercentage: 0.6,
        categoryPercentage: 0.8,
      },
      {
        label: "รอบบ่าย",
        data: [afternoonStats.pending, afternoonStats.completed, afternoonStats.problem],
        backgroundColor: "#f59e0b",
        borderRadius: 4,
        barPercentage: 0.6,
        categoryPercentage: 0.8,
      },
    ],
  };

  recentActivities.value = filteredSessions.slice(0, 50);
};

// --- Computed สำหรับ Progress Bar ---
const progressStats = computed(() => {
  const map = {};

  if (selectedBuilding.value === "ทั้งหมด") {
    rawLocations.value.forEach((loc) => {
      const key = loc.locations_building;
      if (!map[key]) map[key] = { name: `อาคาร ${key}`, target: 0, done: 0, id: key };
      map[key].target += 1;
    });

    rawSessions.value.forEach((s) => {
      if (["pass", "fixed", "approved"].includes(s.check_sessions_status)) {
        const key = s.locations.locations_building;
        if (map[key]) map[key].done += 1;
      }
    });
  } else {
    const targetLocations = rawLocations.value.filter(
      (l) => l.locations_building === selectedBuilding.value
    );

    targetLocations.forEach((loc) => {
      const key = `${loc.locations_floor}`;
      if (!map[key])
        map[key] = {
          name: `ชั้น ${loc.locations_floor}`,
          target: 0,
          done: 0,
          floor: parseInt(loc.locations_floor),
        };
      map[key].target += 1;
    });

    const targetSessions = rawSessions.value.filter(
      (s) => s.locations.locations_building === selectedBuilding.value
    );

    targetSessions.forEach((s) => {
      if (["pass", "fixed", "approved"].includes(s.check_sessions_status)) {
        const key = `${s.locations.locations_floor}`;
        if (map[key]) map[key].done += 1;
      }
    });
  }

  return Object.values(map)
    .sort((a, b) => {
      if (a.floor !== undefined) return a.floor - b.floor;
      return a.name.localeCompare(b.name);
    })
    .map((item) => ({
      name: item.name,
      total: item.target,
      completed: Math.min(item.done, item.target * 2),
    }));
});

// --- Main Fetch Logic ---
const fetchData = async () => {
  try {
    const today = getTodayDate();

    // 1. Fetch Locations
    const { data: allLocations, error: locError } = await supabase
      .from("locations")
      .select("locations_id, locations_building, locations_floor")
      .eq("locations_status", "active");
    if (locError) throw locError;

    rawLocations.value = allLocations;

    const buildings = [...new Set(allLocations.map((l) => l.locations_building))].sort();
    uniqueBuildings.value = buildings;

    // 2. Fetch Sessions
    const { data: sessions, error } = await supabase
      .from("check_sessions")
      .select(
        `
        *, 
        locations(locations_id, locations_building, locations_floor, locations_name), 
        employees:employees!check_sessions_employees_id_fkey(*)
      `
      )
      .eq("check_sessions_date", today)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    rawSessions.value = sessions;

    // 3. Fetch Reviews
    const { data: feedbacks, error: feedbackError } = await supabase
      .from("feedbacks")
      .select("rating")
      .gte("created_at", `${today}T00:00:00`)
      .lte("created_at", `${today}T23:59:59`);
    if (feedbackError) throw feedbackError;

    rawFeedbacks.value = feedbacks;

    calculateDashboardData();
  } catch (err) {
    console.error("Error fetching dashboard:", err);
  } finally {
    loading.value = false;
    isRefreshing.value = false;
  }
};

// ✅ สร้างตัวแปรเก็บวันที่แบบเป๊ะๆ (ใช้ตัวนี้ใน Template)
const currentDate = new Date().toLocaleDateString("th-TH", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long", // เพิ่มวันในสัปดาห์ เช่น "วันศุกร์ที่ 25..."
});

watch(selectedBuilding, () => {
  calculateDashboardData();
});

const handleRefresh = async () => {
  isRefreshing.value = true;
  await fetchData();
};

const subscribeRealtime = () => {
  if (realtimeChannel.value) supabase.removeChannel(realtimeChannel.value);
  realtimeChannel.value = supabase
    .channel("dashboard-main-stats")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "check_sessions" },
      () => fetchData()
    )
    .on("postgres_changes", { event: "*", schema: "public", table: "feedbacks" }, () =>
      fetchData()
    )
    .subscribe();
};

onMounted(() => {
  fetchData();
  subscribeRealtime();
  window.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  if (realtimeChannel.value) supabase.removeChannel(realtimeChannel.value);
  window.removeEventListener("click", handleClickOutside);
});
</script>

<template>
  <div class="space-y-6 pb-10">
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
          Dashboard
        </h1>
        <p class="text-gray-500 dark:text-slate-400 mt-1 flex-wrap items-center gap-2">
          ภาพรวมการทำงานประจำวันที่
          <span
            class="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-gray-600 dark:text-slate-300 whitespace-nowrap"
          >
            <Calendar class="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            <span>{{ currentDate }}</span>
          </span>
        </p>
      </div>

      <div class="flex items-center gap-3">
        <div class="relative custom-dropdown-container min-w-[160px]">
          <button
            @click="toggleBuildingDropdown"
            class="flex items-center justify-between w-full pl-3 pr-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-700 dark:text-white shadow-sm hover:border-indigo-500 hover:ring-2 hover:ring-indigo-100 dark:hover:ring-indigo-900 transition-all focus:outline-none"
            :class="{
              'border-indigo-500 ring-2 ring-indigo-100 dark:ring-indigo-900': isBuildingDropdownOpen,
            }"
          >
            <div class="flex items-center gap-2">
              <Filter
                class="h-4 w-4 text-gray-400 dark:text-slate-500"
                :class="{
                  'text-indigo-500 dark:text-indigo-400': isBuildingDropdownOpen,
                }"
              />
              <span class="truncate">{{
                selectedBuilding === "ทั้งหมด"
                  ? "อาคารทั้งหมด"
                  : `อาคาร ${selectedBuilding}`
              }}</span>
            </div>
            <ChevronDown
              class="h-4 w-4 text-gray-400 dark:text-slate-500 transition-transform duration-200"
              :class="{ 'rotate-180': isBuildingDropdownOpen }"
            />
          </button>

          <div
            v-if="isBuildingDropdownOpen"
            class="absolute top-full right-0 mt-1 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 origin-top-right"
          >
            <div class="p-1 max-h-60 overflow-y-auto custom-scrollbar">
              <div
                @click="selectBuilding('ทั้งหมด')"
                class="px-3 py-2 rounded-lg text-sm cursor-pointer flex items-center justify-between transition-colors"
                :class="
                  selectedBuilding === 'ทั้งหมด'
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-medium'
                    : 'hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300'
                "
              >
                <span>อาคารทั้งหมด</span>
                <Check
                  v-if="selectedBuilding === 'ทั้งหมด'"
                  class="w-4 h-4 text-indigo-600 dark:text-indigo-400"
                />
              </div>

              <div class="h-px bg-gray-100 dark:bg-slate-700 my-1"></div>

              <div
                v-for="b in uniqueBuildings"
                :key="b"
                @click="selectBuilding(b)"
                class="px-3 py-2 rounded-lg text-sm cursor-pointer flex items-center justify-between transition-colors"
                :class="
                  selectedBuilding === b
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-medium'
                    : 'hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300'
                "
              >
                <span>อาคาร {{ b }}</span>
                <Check
                  v-if="selectedBuilding === b"
                  class="w-4 h-4 text-indigo-600 dark:text-indigo-400"
                />
              </div>
            </div>
          </div>
        </div>

        <button
          @click="handleRefresh"
          :disabled="isRefreshing"
          class="text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:shadow-sm active:scale-95 disabled:opacity-70"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isRefreshing }" />
          <span class="hidden sm:inline">{{
            isRefreshing ? "กำลังอัปเดต..." : "อัปเดต"
          }}</span>
        </button>
      </div>
    </div>

    <div
      v-if="loading"
      class="h-96 flex flex-col items-center justify-center bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700"
    >
      <Loader2 class="w-10 h-10 animate-spin text-indigo-600 dark:text-indigo-400 mb-3" />
      <span class="text-gray-400 dark:text-slate-500 text-sm font-medium"
        >กำลังประมวลผลข้อมูล...</span
      >
    </div>

    <div v-else class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <StatsCards :stats="stats" />

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        <div
          class="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 min-h-[400px] lg:h-[480px] flex flex-col relative overflow-hidden"
        >
          <h3
            class="font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2 text-lg"
          >
            <div class="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
              <BarChart3 class="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            </div>
            เปรียบเทียบผลงาน รอบเช้า vs บ่าย
          </h3>
          <div class="flex-1 w-full min-h-0 relative">
            <TaskTrendsChart :chart-data="chartData" :chart-options="chartOptions" />
          </div>
        </div>

        <div
          class="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 flex flex-col min-h-[400px] lg:h-[480px] relative overflow-hidden"
        >
          <h3
            class="font-bold text-gray-800 dark:text-white mb-4 flex items-center justify-between gap-2 text-lg"
          >
            <div class="flex items-center gap-2">
              <div class="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                <Building class="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
              </div>
              <span>{{
                selectedBuilding === "ทั้งหมด"
                  ? "ภาพรวมรายอาคาร"
                  : `ความคืบหน้า อาคาร ${selectedBuilding}`
              }}</span>
            </div>
          </h3>

          <div class="flex-1 overflow-y-auto pr-2 space-y-5 custom-scrollbar">
            <div v-for="item in progressStats" :key="item.name" class="space-y-2 group">
              <div class="flex justify-between text-sm items-end">
                <span
                  class="font-semibold text-gray-700 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
                >
                  {{ item.name }}
                </span>
                <div class="text-right flex items-baseline gap-1">
                  <span
                    class="font-bold text-lg"
                    :class="
                      item.completed >= item.total
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-gray-800 dark:text-white'
                    "
                  >
                    {{ item.completed }}
                  </span>
                  <span class="text-gray-400 dark:text-slate-500 text-xs font-medium"
                    >งาน</span
                  >
                </div>
              </div>

              <div
                class="h-2.5 w-full bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden relative shadow-inner"
              >
                <div
                  class="h-full rounded-full transition-all duration-1000 ease-out relative"
                  :class="getProgressColor((item.completed / (item.total * 2)) * 100)"
                  :style="{
                    width: `${Math.min((item.completed / (item.total * 1)) * 100, 100)}%`,
                  }"
                >
                  <div
                    class="absolute top-0 left-0 bottom-0 right-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full -translate-x-full animate-shimmer"
                  ></div>
                </div>
              </div>
            </div>

            <div
              v-if="progressStats.length === 0"
              class="flex flex-col items-center justify-center h-full text-gray-400 dark:text-slate-500 text-sm opacity-60"
            >
              <Building class="w-12 h-12 mb-2 stroke-1" />
              ไม่พบข้อมูล
            </div>
          </div>

          <div
            class="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white dark:from-slate-800 to-transparent pointer-events-none"
          ></div>
        </div>
      </div>

      <div
        class="bg-white dark:bg-slate-800 h-[500px] rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden flex flex-col"
      >
        <div
          class="p-6 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between gap-2 shrink-0"
        >
          <div class="flex items-center gap-2">
            <div class="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
              <TrendingUp class="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            </div>
            <h3 class="font-bold text-gray-800 dark:text-white text-lg">กิจกรรมล่าสุด</h3>
          </div>
        </div>

        <div class="flex-1 min-h-0 p-1">
          <RecentActivityList :activities="recentActivities" @click="goToDetail" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
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

/* Shimmer Animation */
@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}
.animate-shimmer {
  animation: shimmer 2s infinite linear;
}
</style>
