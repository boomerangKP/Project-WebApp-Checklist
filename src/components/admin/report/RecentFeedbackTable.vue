<script setup>
import { computed } from "vue";
import {
  Calendar,
  Star,
  Inbox,
  Clock,
  MapPin,
  Eye,
} from "lucide-vue-next";
import Swal from "sweetalert2";

const props = defineProps({
  feedbacks: Array,
  topics: { type: Object, default: () => ({}) },
});

// ✅ ลบ Logic Pagination ภายในออกทั้งหมด (เพราะ Parent จัดการให้แล้ว)
const totalItems = computed(() => props.feedbacks?.length || 0);

// --- Helper Functions ---
const formatDate = (dateString) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
    calendar: "buddhist",
  });
};
const formatTime = (dateString) => {
  if (!dateString) return "-";
  return (
    new Date(dateString).toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    }) + " น."
  );
};

// ✅ Helper: ฟังก์ชันย่อรูปภาพ (เตรียมไว้สำหรับแสดงรูปหลักฐานในอนาคต)
const getOptimizedPhoto = (url) => {
  if (!url) return "";
  if (url.includes('base64')) return url;
  return `${url}?width=100&height=100&resize=cover`;
};

const calculateRealAverage = (item) => {
  if (item.answers && typeof item.answers === "object") {
    const scores = Object.values(item.answers).map((a) => Number(a.rating || a) || 0);
    const validScores = scores.filter((s) => s > 0);
    if (validScores.length > 0) {
      const total = validScores.reduce((sum, score) => sum + score, 0);
      return (total / validScores.length).toFixed(1);
    }
  }
  return Number(item.rating || 0).toFixed(1);
};

// --- HTML Generators ---
const generateTopicListHTML = (answers) => {
  if (!answers || Object.keys(answers).length === 0)
    return '<div class="text-gray-400 dark:text-slate-500 text-xs italic text-center">ไม่มีข้อมูลรายข้อย่อย</div>';

  let html = '<div class="space-y-2">';
  for (const [id, value] of Object.entries(answers)) {
    const score = Number(value.rating || value);
    const topicName = props.topics[id] || `หัวข้อประเมินที่ ${id}`;

    const scoreColor =
      score >= 4
        ? "text-green-600 dark:text-green-400"
        : score >= 3
        ? "text-yellow-600 dark:text-yellow-400"
        : "text-red-600 dark:text-red-400";

    html += `
      <div class="flex justify-between items-center text-sm border-b border-dashed border-gray-100 dark:border-slate-700 pb-1 last:border-0">
        <span class="text-gray-600 dark:text-slate-300 truncate pr-2 w-3/4">${topicName}</span>
        <span class="font-bold ${scoreColor} flex items-center gap-1">
           ${score} <span class="text-[10px] text-gray-300 dark:text-slate-600">/5</span>
        </span>
      </div>
    `;
  }
  html += "</div>";
  return html;
};

const showDetail = (item) => {
  const formattedDate = `${formatDate(item.created_at)} เวลา ${formatTime(
    item.created_at
  )}`;
  const score = calculateRealAverage(item);
  const topicListHTML = generateTopicListHTML(item.answers);

  const isDark = document.documentElement.classList.contains("dark");
  const bgClass = isDark ? "#1e293b" : "#ffffff";
  const textClass = isDark ? "#f8fafc" : "#1f2937";

  Swal.fire({
    title: `<div class="text-lg font-bold text-left p-4" style="color: ${textClass}">${item.locations?.locations_name}</div>`,
    background: bgClass,
    color: textClass,
    html: `
      <div class="text-left font-sans max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        <div class="flex items-center gap-2 mb-4 text-xs" style="color: ${
          isDark ? "#94a3b8" : "#4b5563"
        }">
           <span class="px-2 py-1 rounded" style="background-color: ${
             isDark ? "#334155" : "#f3f4f6"
           }">อาคาร ${item.locations?.locations_building || "-"}</span>
           <span class="px-2 py-1 rounded" style="background-color: ${
             isDark ? "#334155" : "#f3f4f6"
           }">ชั้น ${item.locations?.locations_floor || "-"}</span>
           <span class="ml-auto" style="color: ${
             isDark ? "#64748b" : "#9ca3af"
           }">${formattedDate}</span>
        </div>

        <div class="flex items-center justify-between p-4 rounded-xl mb-4" style="background-color: ${
          isDark ? "#312e81" : "#eef2ff"
        }; border: 1px solid ${isDark ? "#4338ca" : "#e0e7ff"}">
           <span class="font-bold text-sm" style="color: ${
             isDark ? "#a5b4fc" : "#312e81"
           }">ความพึงพอใจโดยรวม</span>
           <div class="flex items-center gap-2">
              <span class="text-3xl font-bold" style="color: ${
                isDark ? "#818cf8" : "#4f46e5"
              }">${score}</span>
              <div class="text-xs flex flex-col items-center leading-none" style="color: ${
                isDark ? "#6366f1" : "#818cf8"
              }">
                <span>คะแนน</span>
                <span>เฉลี่ย</span>
              </div>
           </div>
        </div>

        <div class="mb-4">
           <label class="block text-xs font-bold uppercase mb-2" style="color: ${
             isDark ? "#64748b" : "#6b7280"
           }">คะแนนรายหัวข้อ (Breakdown)</label>
           <div class="p-3 rounded-xl border" style="background-color: ${
             isDark ? "#0f172a" : "#ffffff"
           }; border-color: ${isDark ? "#334155" : "#e5e7eb"}">
              ${topicListHTML}
           </div>
        </div>

        <div>
           <label class="block text-xs font-bold uppercase mb-2" style="color: ${
             isDark ? "#64748b" : "#6b7280"
           }">ข้อเสนอแนะเพิ่มเติม</label>
           <div class="p-4 rounded-xl border text-sm leading-relaxed min-h-[60px]" style="background-color: ${
             isDark ? "#0f172a" : "#f9fafb"
           }; border-color: ${isDark ? "#334155" : "#f3f4f6"}; color: ${
      isDark ? "#cbd5e1" : "#374151"
    }">
              ${
                item.comment ||
                '<span style="color: #94a3b8; font-style: italic;">ไม่มีข้อเสนอแนะ</span>'
              }
           </div>
        </div>
      </div>
    `,
    showConfirmButton: true,
    confirmButtonText: "ปิด",
    confirmButtonColor: isDark ? "#475569" : "#374151",
    customClass: {
      popup: "",
      title: "p-0",
      htmlContainer: "m-0 p-4",
    },
    width: "400px",
    padding: "0",
  });
};
</script>

<template>
  <div
    class="bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col h-screen relative transition-colors duration-300"
  >
    <div
      class="p-3 border-b border-gray-50 dark:border-slate-700 flex justify-between items-center shrink-0"
    >
      <div class="flex items-center gap-3">
        <h3 class="font-bold text-gray-800 dark:text-white text-xl">
          รายการประเมินล่าสุด
        </h3>
      </div>
      <span
        class="text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-4 py-1.5 rounded-full border border-indigo-100 dark:border-indigo-800"
      >
        รวม {{ totalItems }} รายการ
      </span>
    </div>

    <div class="overflow-y-auto custom-scrollbar flex-1">
      <table class="w-full text-left border-collapse relative">
        <thead
          class="bg-gray-50 dark:bg-slate-900 text-sm text-gray-600 dark:text-slate-400 uppercase font-bold tracking-wider sticky top-0 z-10 shadow-sm"
        >
          <tr>
            <th class="px-2 py-2 bg-gray-50 dark:bg-slate-900 whitespace-nowrap w-[120px]">วันที่</th>
            <th class="px-2 py-2 bg-gray-50 dark:bg-slate-900 text-center whitespace-nowrap w-[100px]">เวลา</th>
            <th class="px-2 py-2 bg-gray-50 dark:bg-slate-900 whitespace-nowrap">จุดตรวจ</th>
            <th class="px-2 py-2 bg-gray-50 dark:bg-slate-900 text-center whitespace-nowrap w-[80px]">อาคาร</th>
            <th class="px-2 py-2 bg-gray-50 dark:bg-slate-900 text-center whitespace-nowrap w-[80px]">ชั้น</th>
            <th class="px-2 py-2 text-center bg-gray-50 dark:bg-slate-900 whitespace-nowrap w-[100px]">คะแนน</th>
            <th class="px-2 py-2 bg-gray-50 dark:bg-slate-900 text-right whitespace-nowrap w-[80px]">เพิ่มเติม</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-gray-50 dark:divide-slate-700 text-base">
          <tr v-if="!feedbacks || feedbacks.length === 0">
            <td colspan="7" class="px-6 py-24 text-center text-gray-400 dark:text-slate-500">
              <div class="flex flex-col items-center gap-3">
                <Inbox class="w-12 h-12 text-gray-300 dark:text-slate-600" />
                <span class="text-lg">ไม่พบข้อมูลในหน้านี้</span>
              </div>
            </td>
          </tr>

          <tr
            v-for="item in feedbacks"
            :key="item.id"
            class="hover:bg-gray-50/50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <td class="px-2 py-2 text-gray-700 dark:text-slate-300 whitespace-nowrap">
              <div class="flex items-center gap-2.5">
                <Calendar class="w-5 h-5 text-gray-400 dark:text-slate-500" />
                {{ formatDate(item.created_at) }}
              </div>
            </td>

            <td class="px-2 py-2 text-center whitespace-nowrap">
              <div
                class="inline-flex items-center gap-2 px-3 py-1.5 text-gray-700 dark:text-slate-300 dark:border-slate-600"
              >
                <Clock class="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                <span class="font-mono font-medium">{{ formatTime(item.created_at) }}</span>
              </div>
            </td>

            <td class="px-2 py-2 whitespace-nowrap">
              <div class="flex flex-col">
                <div class="font-bold text-gray-800 dark:text-white flex items-center gap-2 truncate max-w-[250px] sm:max-w-none text-base">
                  <MapPin class="w-5 h-5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                  <span class="truncate">{{ item.locations?.locations_name || "-" }}</span>
                </div>
              </div>
            </td>

            <td class="px-2 py-2 text-center whitespace-nowrap">
              <div class="inline-flex items-center gap-1.5 text-gray-700 dark:text-slate-300 px-2 py-1">
                <span class="font-medium">{{ item.locations?.locations_building || "-" }}</span>
              </div>
            </td>

            <td class="px-2 py-2 text-center whitespace-nowrap">
              <div class="inline-flex items-center justify-center min-w-[36px] h-[28px] text-gray-700 dark:text-slate-300 text-sm font-bold">
                {{ item.locations?.locations_floor || "-" }}
              </div>
            </td>

            <td class="px-2 py-2 text-center">
              <div
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold"
                :class="
                  calculateRealAverage(item) >= 4
                    ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : calculateRealAverage(item) >= 3
                    ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                    : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                "
              >
                <Star class="w-4 h-4 fill-current" />
                {{ calculateRealAverage(item) }}
              </div>
            </td>

            <td class="px-2 py-2 text-right">
              <button
                @click="showDetail(item)"
                class="text-gray-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full group relative"
                title="ดูรายละเอียด"
              >
                <Eye class="w-5 h-5" />
                <span
                  v-if="item.comment"
                  class="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-800"
                ></span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>
</template>

<style>
/* Style คงเดิม */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 20px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: #94a3b8;
}

:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #475569;
}
</style>