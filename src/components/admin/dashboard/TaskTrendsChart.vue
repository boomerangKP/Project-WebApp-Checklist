<script setup>
import { Bar } from "vue-chartjs";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from "chart.js";

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

defineProps({
  chartData: { type: Object, required: true },
  chartOptions: { type: Object, required: true },
});
</script>

<template>
  <div class="flex flex-col h-full w-full">
    <div class="flex-1 relative w-full min-h-[250px]">
      <Bar :data="chartData" :options="chartOptions" />
    </div>

    <div class="mt-4 text-center text-xs text-gray-400 dark:text-slate-400 shrink-0 pb-1">
      กราฟแสดงสถานะงานประจำวัน แยกตามประเภท
    </div>
  </div>
</template>
