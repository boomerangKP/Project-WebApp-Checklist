<script setup>
import { Heart, Loader2, Download } from "lucide-vue-next";
import { useReportSatisfaction } from "@/composables/useReportSatisfaction";

// Components
import StatsCards from "@/components/admin/report/StatsCards.vue";
import FeedbackCharts from "@/components/admin/report/FeedbackCharts.vue";
import RecentFeedbackTable from "@/components/admin/report/RecentFeedbackTable.vue";

// ใช้ Logic ที่แยกออกไป
const { 
  loading, feedbacks, dateFilter, stats, 
  trendChartData, topicChartData, exportToExcel 
} = useReportSatisfaction();
</script>

<template>
  <div class="space-y-6 pb-10">
    
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Heart class="w-7 h-7 text-pink-500 fill-pink-500" /> รายงานความพึงพอใจ
        </h1>
        <p class="text-gray-500 text-sm mt-1">สรุปคะแนนการประเมินจากผู้ใช้บริการ</p>
      </div>

      <div class="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
        <button 
          v-for="f in ['today', 'week', 'month', 'all']" 
          :key="f"
          @click="dateFilter = f"
          class="px-4 py-1.5 text-xs font-medium rounded-md transition-all"
          :class="dateFilter === f ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'"
        >
          {{ f === 'today' ? 'วันนี้' : f === 'week' ? 'สัปดาห์นี้' : f === 'month' ? 'เดือนนี้' : 'ทั้งหมด' }}
        </button>
        <button @click="exportToExcel" class="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium shadow-sm transition-all active:scale-95">
          <Download class="w-4 h-4" /> <span>Export Excel</span>
        </button>
      </div>
    </div>

    <div v-if="loading" class="h-64 flex flex-col items-center justify-center">
      <Loader2 class="w-10 h-10 animate-spin text-indigo-500 mb-2" />
      <span class="text-gray-400">กำลังประมวลผลข้อมูล...</span>
    </div>

    <div v-else class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <StatsCards :stats="stats" />
      <FeedbackCharts :trendData="trendChartData" :topicData="topicChartData" />
      <RecentFeedbackTable :feedbacks="feedbacks" />
    </div>

  </div>
</template>