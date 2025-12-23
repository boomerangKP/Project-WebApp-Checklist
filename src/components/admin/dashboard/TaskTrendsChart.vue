<script setup>
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

defineProps({
  chartData: { type: Object, required: true },
  chartOptions: { type: Object, required: true }
})
</script>

<template>
  <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full">
    <h3 class="text-xl font-bold text-gray-800 mb-6">Task Trends</h3>
    <div class="flex-1 relative w-full min-h-[300px]">
       <Bar :data="chartData" :options="chartOptions" />
    </div>
    <div class="mt-4 text-center text-sm text-gray-500">
      กราฟแสดงสถานะงานประจำวัน แยกตามประเภท
    </div>
  </div>
</template>
