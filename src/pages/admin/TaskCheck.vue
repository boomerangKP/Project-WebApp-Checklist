<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";
import { Loader2, CheckCircle, Search } from "lucide-vue-next";
import { useTaskLogic } from "@/composables/useTaskLogic";
import { TASK_STATUS } from '@/constants/status';

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
  totalItemsCount
} = useTaskLogic();

const tabs = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: TASK_STATUS.WAITING, label: 'รอตรวจสอบ' },
  { id: TASK_STATUS.APPROVED, label: 'ตรวจสอบแล้ว' },
  { id: TASK_STATUS.REJECTED, label: 'แก้ไข' },
];

// ✅ ฟังก์ชันช่วยเลือกสี
const getTabClass = (tabId, isActive) => {
    if (tabId === 'all') {
        return isActive
            ? 'bg-[#6c757d] border-[#6c757d] text-white shadow-sm font-semibold'
            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-700 dark:bg-slate-800 dark:text-gray-400 dark:border-slate-600 dark:hover:bg-slate-700';
    }
    if (tabId === TASK_STATUS.WAITING) {
        return isActive
            ? 'bg-[#f39c12] border-[#f39c12] text-white shadow-sm font-semibold'
            : 'bg-white text-gray-500 border-gray-200 hover:bg-[#fff9eb] hover:text-[#f39c12] hover:border-[#f39c12]/30 dark:bg-slate-800 dark:text-gray-400 dark:border-slate-600 dark:hover:text-[#f39c12]';
    }
    if (tabId === TASK_STATUS.APPROVED) {
        return isActive
            ? 'bg-[#27ae60] border-[#27ae60] text-white shadow-sm font-semibold'
            : 'bg-white text-gray-500 border-gray-200 hover:bg-[#f0fff4] hover:text-[#27ae60] hover:border-[#27ae60]/30 dark:bg-slate-800 dark:text-gray-400 dark:border-slate-600 dark:hover:text-[#27ae60]';
    }
    if (tabId === TASK_STATUS.REJECTED) {
        return isActive
            ? 'bg-[#e74c3c] border-[#e74c3c] text-white shadow-sm font-semibold'
            : 'bg-white text-gray-500 border-gray-200 hover:bg-[#fff5f5] hover:text-[#e74c3c] hover:border-[#e74c3c]/30 dark:bg-slate-800 dark:text-gray-400 dark:border-slate-600 dark:hover:text-[#e74c3c]';
    }
    return '';
};

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
  <div class="flex flex-col h-[calc(100vh-5px)] sm:h-full gap-5 pb-0 font-sarabun">

    <div class="shrink-0 space-y-4">
      <div class="flex items-center justify-between px-1">
        <h1 class="text-2xl font-bold text-gray-800 dark:text-white truncate">
          รายการตรวจสอบงาน
        </h1>
      </div>

      <TaskFilter
        v-model:searchQuery="searchQuery"
        v-model:selectedMaid="selectedMaid"
        v-model:startDate="startDate"
        v-model:endDate="endDate"
        v-model:dateRange="dateRange"
        :maids="uniqueMaids"
        :search-suggestions="allSearchSuggestions"
        @refresh="fetchTasks"
      />
    </div>

    <div
      class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden flex flex-col relative transition-colors duration-300 flex-1 min-h-0"
    >
      <div class="px-5 py-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50 flex flex-wrap justify-between items-center gap-4 shrink-0">

        <div class="flex gap-2 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            class="relative px-4 py-1.5 rounded-full text-sm border transition-all duration-200 whitespace-nowrap font-medium"
            :class="getTabClass(tab.id, activeTab === tab.id)"
          >
            {{ tab.label }}
            <span v-if="tab.id === TASK_STATUS.WAITING && waitingCount > 0"
                  class="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full font-bold transition-colors"
                  :class="activeTab === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300'">
               {{ waitingCount }}
            </span>
          </button>
        </div>

        <div class="flex items-center gap-2" v-if="activeTab === TASK_STATUS.WAITING">
            <button
                @click="isSelectionMode = !isSelectionMode"
                class="px-3 py-2 rounded-lg text-sm border font-medium flex items-center gap-2 transition-colors"
                :class="isSelectionMode
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                  : 'text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'"
            >
                <CheckCircle class="w-4 h-4" />
                <span class="hidden sm:inline">{{ isSelectionMode ? 'ยกเลิก' : 'เลือกรายการ' }}</span>
            </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto bg-white dark:bg-slate-800 custom-scrollbar relative">
        <div v-if="loading" class="flex justify-center py-20 h-full items-center">
          <Loader2 class="w-8 h-8 text-blue-400 animate-spin" />
        </div>

        <div v-else class="min-h-[300px]">
          <div v-if="paginatedTasks.length > 0 && isSelectionMode && activeTab === TASK_STATUS.WAITING" class="px-5 py-2 bg-gray-50 dark:bg-slate-700/30 border-b border-gray-100 dark:border-slate-700 flex items-center gap-3">
             <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" class="rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-800 w-4 h-4 cursor-pointer">
             <span class="text-sm text-gray-600 dark:text-gray-300">เลือกทั้งหมดในหน้านี้</span>
          </div>

          <div v-if="paginatedTasks.length > 0">
             <div class="divide-y divide-gray-100 dark:divide-slate-700/50">
                <TaskCard
                    v-for="task in paginatedTasks"
                    :key="task.id"
                    :task="task"
                    :isSelectionMode="isSelectionMode && activeTab === TASK_STATUS.WAITING"
                    :isSelected="selectedIds.includes(task.id)"
                    @click="openTaskDetail(task.id)"
                    @toggleSelect="toggleSelection"
                    class="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors border-0 shadow-none rounded-none"
                />
             </div>
          </div>

          <div v-if="paginatedTasks.length === 0" class="flex flex-col items-center justify-center py-20 h-full text-gray-400 dark:text-gray-500">
             <div class="w-16 h-16 bg-gray-50 dark:bg-slate-700/50 rounded-full flex items-center justify-center mb-4 transition-colors text-3xl">
                📭
            </div>
            <p class="text-sm font-medium">ไม่พบรายการ</p>
          </div>
        </div>
      </div>

      <div class="shrink-0 z-20 border-t border-gray-100 dark:border-slate-700 bg-gray-50/30 dark:bg-slate-800 px-4">
        <TaskPagination
          :currentPage="currentPage"
          :totalPages="totalPages"
          :startEntry="startEntry"
          :endEntry="endEntry"
          :totalItems="totalItemsCount"
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
.font-sarabun {
    font-family: 'Sarabun', sans-serif;
}

.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; }
:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #64748b; }

.hide-scrollbar::-webkit-scrollbar { display: none; }
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
