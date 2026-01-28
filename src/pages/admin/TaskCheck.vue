<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";
import { Loader2 } from "lucide-vue-next";
import { useTaskLogic } from "@/composables/useTaskLogic"; 

// Components
import TaskFilter from "@/components/admin/task/TaskFilter.vue";
import TaskCard from "@/components/admin/task/TaskCard.vue";
import TaskPagination from "@/components/admin/task/TaskPagination.vue";
import BulkActionBar from "@/components/admin/task/BulkActionBar.vue";

const router = useRouter();

const {
  loading, activeTab, searchQuery, selectedMaid, dateRange, currentPage, itemsPerPage,
  isSelectionMode, selectedIds, isBulkSubmitting, uniqueMaids, filteredTasks,
  paginatedTasks, totalPages, startEntry, endEntry, waitingCount, isAllSelected,
  fetchTasks, changePage, toggleSelection, toggleSelectAll, handleBulkApprove, startDate, endDate,
} = useTaskLogic();

const allSearchSuggestions = computed(() => {
  const suggestions = new Set();
  if (uniqueMaids.value) uniqueMaids.value.forEach((m) => suggestions.add(m));
  if (filteredTasks.value) {
    filteredTasks.value.forEach((task) => {
      if (task.code) suggestions.add(task.code);
      if (task.check_sessions_id) suggestions.add(String(task.check_sessions_id));
      if (task.displayId) suggestions.add(task.displayId);
      if (task.location) suggestions.add(task.location);
      if (task.location_name) suggestions.add(task.location_name);
      if (task.locations?.locations_name) suggestions.add(task.locations.locations_name);
    });
  }
  return Array.from(suggestions);
});

const openTaskDetail = (id) => router.push({ path: `/admin/check/${id}` });
</script>

<template>
  <div class="flex flex-col h-[calc(100vh-10px)] sm:h-full gap-3 sm:gap-4 pb-0">
    
    <div class="shrink-0 space-y-2 sm:space-y-4">
      <div class="flex items-center justify-between px-1">
        <h1 class="text-lg sm:text-2xl font-bold text-gray-800 dark:text-white truncate">
          รายการตรวจสอบงาน
        </h1>
      </div>

      <TaskFilter
        v-model:activeTab="activeTab"
        v-model:searchQuery="searchQuery"
        v-model:selectedMaid="selectedMaid"
        v-model:startDate="startDate"
        v-model:endDate="endDate"
        v-model:dateRange="dateRange"
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

    <div
      class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden flex flex-col relative transition-colors duration-300 flex-1 min-h-0"
    >
      <div class="flex-1 overflow-y-auto p-2 sm:p-4 bg-gray-50/50 dark:bg-slate-900/50 custom-scrollbar relative">
        <div v-if="loading" class="flex justify-center py-20 h-full items-center">
          <Loader2 class="w-8 h-8 text-gray-400 animate-spin" />
        </div>

        <div v-else class="space-y-2 pb-24"> <TaskCard
            v-for="task in paginatedTasks"
            :key="task.id"
            :task="task"
            :isSelectionMode="isSelectionMode"
            :isSelected="selectedIds.includes(task.id)"
            @click="openTaskDetail(task.id)"
            @toggleSelect="toggleSelection"
          />

          <div v-if="paginatedTasks.length === 0" class="flex flex-col items-center justify-center py-10 h-full text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
            <span class="text-3xl mb-2 opacity-50">📭</span>
            <p class="text-sm">ไม่พบรายการ</p>
          </div>
        </div>
      </div>

      <div class="shrink-0 z-20 bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700">
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
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
:global(.dark) .custom-scrollbar::-webkit-scrollbar-track { background: #1e293b; }
:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; }
</style>