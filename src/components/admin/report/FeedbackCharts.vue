<script setup>
import { TrendingUp, Filter } from "lucide-vue-next";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar } from "vue-chartjs";
import { computed } from "vue"; // ✅ เพิ่ม computed

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

defineProps({
  trendData: Object,
  topicData: Object,
});

// --- เช็ค Dark Mode (เพื่อให้ Chart ปรับสีตาม) ---
const isDark = document.documentElement.classList.contains("dark");
const textColor = isDark ? "#94a3b8" : "#64748b"; // slate-400 : gray-500
const gridColor = isDark ? "#334155" : "#e5e7eb"; // slate-700 : gray-200

// --- ฟังก์ชันตัดคำภาษาไทย (ไม่ให้คำฉีก) ---
const formatTooltipTitle = (tooltipItems) => {
  const text = tooltipItems[0].label;
  const maxLength = 35; // ความยาวต่อบรรทัด (ตัวอักษร)

  // ถ้า Browser รองรับการตัดคำไทย (Modern Browsers)
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter("th", { granularity: "word" });
    const words = [...segmenter.segment(text)].map((s) => s.segment);

    let lines = [];
    let currentLine = "";

    for (const word of words) {
      if ((currentLine + word).length > maxLength) {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine += word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  // Fallback: ถ้า Browser รุ่นเก่ามาก ไม่รองรับ ให้ตัดตามยาวเหมือนเดิมไปก่อน
  const chunks = [];
  for (let i = 0; i < text.length; i += maxLength) {
    chunks.push(text.slice(i, i + maxLength));
  }
  return chunks;
};

// --- ตั้งค่ากราฟเส้น (Trend) ---
// ✅ ใช้ computed เพื่อให้สี Grid/Label เปลี่ยนตามได้ถ้าต้องการ (ในที่นี้ fix ไว้ก่อน)
const trendOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => ` คะแนนเฉลี่ย: ${ctx.formattedValue}`,
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      max: 5,
      ticks: { color: textColor }, // ✅ ปรับสี Label
      grid: { color: gridColor }, // ✅ ปรับสี Grid
    },
    x: {
      grid: { display: false },
      ticks: { color: textColor }, // ✅ ปรับสี Label
    },
  },
}));

// --- ตั้งค่ากราฟแท่ง (Topic) ---
const topicOptions = computed(() => ({
  indexAxis: "y", // แนวนอน
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        // ✅ ใช้ฟังก์ชันตัดคำแบบใหม่ (คำไม่ฉีก)
        title: formatTooltipTitle,
        label: (ctx) => ` คะแนน: ${ctx.formattedValue}`,
      },
    },
  },
  scales: {
    x: {
      beginAtZero: true,
      max: 5,
      ticks: { color: textColor },
      grid: { color: gridColor },
    },
    y: {
      ticks: {
        color: textColor,
        autoSkip: false,
        // ตัดชื่อแกน Y ให้สั้นลง ใส่ ...
        callback: function (val) {
          const label = this.getLabelForValue(val);
          return label.length > 15 ? label.substr(0, 15) + "..." : label;
        },
      },
      grid: { display: false }, // ซ่อน Grid แกน Y ให้สะอาดตา
    },
  },
}));
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div
      class="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 transition-colors duration-300"
    >
      <h3 class="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
        <TrendingUp class="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
        แนวโน้มคะแนนความพึงพอใจ
      </h3>
      <div class="h-64">
        <Line
          v-if="trendData && trendData.labels && trendData.labels.length"
          :data="trendData"
          :options="trendOptions"
        />
        <div
          v-else
          class="h-full flex items-center justify-center text-gray-400 dark:text-slate-500 text-sm"
        >
          ไม่มีข้อมูลสำหรับกราฟ
        </div>
      </div>
    </div>

    <div
      class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 transition-colors duration-300"
    >
      <h3 class="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
        <Filter class="w-5 h-5 text-indigo-500 dark:text-indigo-400" /> คะแนนรายหัวข้อ
      </h3>
      <div class="h-64">
        <Bar
          v-if="topicData && topicData.labels && topicData.labels.length"
          :data="topicData"
          :options="topicOptions"
        />
        <div
          v-else
          class="h-full flex items-center justify-center text-gray-400 dark:text-slate-500 text-sm"
        >
          ไม่มีข้อมูลสำหรับกราฟ
        </div>
      </div>
    </div>
  </div>
</template>
