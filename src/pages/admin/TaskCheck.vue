<script setup>
import { computed } from "vue"; // ✅ 1. อย่าลืม import computed
import { useRouter } from "vue-router";
import { Loader2 } from "lucide-vue-next";
import { useTaskLogic } from "@/composables/useTaskLogic";

// Components
import TaskFilter from "@/components/admin/task/TaskFilter.vue";
import TaskCard from "@/components/admin/task/TaskCard.vue";
import TaskPagination from "@/components/admin/task/TaskPagination.vue";
import BulkActionBar from "@/components/admin/task/BulkActionBar.vue";

const router = useRouter();

// ดึงตัวแปรและฟังก์ชันทั้งหมดมาจาก useTaskLogic
const {
  loading,
  activeTab,
  searchQuery,
  selectedMaid,
  currentPage,
  itemsPerPage,
  isSelectionMode,
  selectedIds,
  isBulkSubmitting,
  uniqueMaids,
  filteredTasks,
  paginatedTasks,
  totalPages,
  startEntry,
  endEntry,
  waitingCount,
  isAllSelected,
  fetchTasks,
  changePage,
  toggleSelection,
  toggleSelectAll,
  handleBulkApprove,
  startDate,
  endDate,
} = useTaskLogic();

// ✅ 2. สร้างรายการ Search Suggestions (รวมชื่อแม่บ้าน + รหัสงาน + สถานที่)
const allSearchSuggestions = computed(() => {
  const suggestions = new Set();

  // 2.1 เพิ่มชื่อแม่บ้าน
  if (uniqueMaids.value) {
    uniqueMaids.value.forEach((m) => suggestions.add(m));
  }

  // 2.2 เพิ่มรหัสงาน และ สถานที่ (จากรายการงานที่มีอยู่)
  if (filteredTasks.value) {
    filteredTasks.value.forEach((task) => {
      // ดึงรหัส (รองรับทั้ง code หรือ check_sessions_id)
      if (task.code) suggestions.add(task.code);
      if (task.check_sessions_id) suggestions.add(String(task.check_sessions_id));

      // ดึงชื่อสถานที่
      if (task.location_name) suggestions.add(task.location_name);
      if (task.locations?.locations_name) suggestions.add(task.locations.locations_name);
    });
  }

  return Array.from(suggestions);
});

const openTaskDetail = (id) => router.push({ path: `/admin/check/${id}` });
</script>

<template>
  <div class="space-y-6 flex-1 flex flex-col">
    <div class="shrink-0 flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-800">รายการตรวจสอบงาน</h1>
    </div>

    <div
      class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-195px)] relative"
    >
      <div class="p-4 border-b border-gray-100 shrink-0 bg-white z-5">
        <TaskFilter
          v-model:activeTab="activeTab"
          v-model:searchQuery="searchQuery"
          v-model:selectedMaid="selectedMaid"
          v-model:startDate="startDate"
          v-model:endDate="endDate"
          :maids="uniqueMaids"
          :isSelectionMode="isSelectionMode"
          :isAllSelected="isAllSelected"
          :waitingCount="waitingCount"
          :search-suggestions="allSearchSuggestions"
          @toggleSelectionMode="isSelectionMode = !isSelectionMode"
          @toggleSelectAll="toggleSelectAll"
          @refresh="fetchTasks"
        />
      </div>

      <div class="flex-1 overflow-y-auto p-4 bg-gray-50/50 custom-scrollbar relative">
        <div v-if="loading" class="flex justify-center py-20 h-full items-center">
          <Loader2 class="w-10 h-10 text-gray-400 animate-spin" />
        </div>

        <div v-else class="space-y-3 pb-4">
          <TaskCard
            v-for="task in paginatedTasks"
            :key="task.id"
            :task="task"
            :isSelectionMode="isSelectionMode"
            :isSelected="selectedIds.includes(task.id)"
            @click="openTaskDetail(task.id)"
            @toggleSelect="toggleSelection"
          />

          <div
            v-if="paginatedTasks.length === 0"
            class="flex flex-col items-center justify-center py-16 h-full text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-white/50"
          >
            <span class="text-4xl mb-2 opacity-50">📭</span>
            <p>ไม่พบรายการงาน ({{ activeTab }})</p>
          </div>
        </div>
      </div>

      <div class="shrink-0 z-20 bg-white relative">
        <TaskPagination
          :currentPage="currentPage"
          :totalPages="totalPages"
          :startEntry="startEntry"
          :endEntry="endEntry"
          :totalItems="filteredTasks.length"
          :itemsPerPage="itemsPerPage"
          @update:itemsPerPage="itemsPerPage = $event"
          @changePage="changePage"
        />
      </div>
    </div>

    <BulkActionBar
      :count="selectedIds.length"
      :loading="isBulkSubmitting"
      @confirm="handleBulkApprove"
      @cancel="selectedIds = []"
    />
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f5f9;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
