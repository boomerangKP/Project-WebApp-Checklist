<script setup>
import { TrendingUp, Filter } from "lucide-vue-next";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler
} from "chart.js";
import { Line, Bar } from "vue-chartjs";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

defineProps({
  trendData: Object,
  topicData: Object
});
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div class="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
        <TrendingUp class="w-5 h-5 text-indigo-500" /> แนวโน้มคะแนนความพึงพอใจ
      </h3>
      <div class="h-64">
        <Line v-if="trendData.labels.length" :data="trendData" :options="{ responsive: true, maintainAspectRatio: false }" />
        <div v-else class="h-full flex items-center justify-center text-gray-400">ไม่มีข้อมูลสำหรับกราฟ</div>
      </div>
    </div>

    <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Filter class="w-5 h-5 text-indigo-500" /> คะแนนรายหัวข้อ
      </h3>
      <div class="h-64">
        <Bar v-if="topicData.labels.length" :data="topicData" :options="{ indexAxis: 'y', responsive: true, maintainAspectRatio: false }" />
        <div v-else class="h-full flex items-center justify-center text-gray-400">ไม่มีข้อมูลสำหรับกราฟ</div>
      </div>
    </div>
  </div>
</template>