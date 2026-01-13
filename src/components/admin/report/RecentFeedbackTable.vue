<script setup>
import { ref, computed, watch } from "vue";
import { 
  Calendar, Star, Inbox, ChevronLeft, ChevronRight, 
  Clock, MapPin, Eye 
} from "lucide-vue-next";
import Swal from 'sweetalert2';

// ✅ รับ props topics เพิ่ม
const props = defineProps({ 
  feedbacks: Array,
  topics: { type: Object, default: () => ({}) } 
});

// --- State & Pagination (คงเดิม) ---
const currentPage = ref(1);
const itemsPerPage = ref(10);

watch(() => props.feedbacks, () => { currentPage.value = 1; });

const totalItems = computed(() => props.feedbacks?.length || 0);
const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value) || 1);

const paginatedFeedbacks = computed(() => {
  if (!props.feedbacks) return [];
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return props.feedbacks.slice(start, end);
});

const startEntry = computed(() => totalItems.value === 0 ? 0 : (currentPage.value - 1) * itemsPerPage.value + 1);
const endEntry = computed(() => Math.min(currentPage.value * itemsPerPage.value, totalItems.value));

const changePage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};

// --- Helper Functions ---
const formatDate = (dateString) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit", calendar: "buddhist" });
};
const formatTime = (dateString) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น.";
};
const calculateRealAverage = (item) => {
  if (item.answers && typeof item.answers === 'object') {
    const scores = Object.values(item.answers).map(a => Number(a.rating || a) || 0);
    const validScores = scores.filter(s => s > 0);
    if (validScores.length > 0) {
      const total = validScores.reduce((sum, score) => sum + score, 0);
      return (total / validScores.length).toFixed(1); 
    }
  }
  return Number(item.rating || 0).toFixed(1);
};

// --- 🔥 สร้าง HTML รายการคะแนนย่อย ---
const generateTopicListHTML = (answers) => {
  if (!answers || Object.keys(answers).length === 0) return '<div class="text-gray-400 text-xs italic text-center">ไม่มีข้อมูลรายข้อย่อย</div>';
  
  let html = '<div class="space-y-2">';
  for (const [id, value] of Object.entries(answers)) {
    const score = Number(value.rating || value);
    // ดึงชื่อหัวข้อจาก props.topics ถ้าไม่มีใช้ "หัวข้อ X"
    const topicName = props.topics[id] || `หัวข้อประเมินที่ ${id}`;
    
    // กำหนดสีคะแนน
    const scoreColor = score >= 4 ? 'text-green-600' : score >= 3 ? 'text-yellow-600' : 'text-red-600';
    
    html += `
      <div class="flex justify-between items-center text-sm border-b border-dashed border-gray-100 pb-1 last:border-0">
        <span class="text-gray-600 truncate pr-2 w-3/4">${topicName}</span>
        <span class="font-bold ${scoreColor} flex items-center gap-1">
           ${score} <span class="text-[10px] text-gray-300">/5</span>
        </span>
      </div>
    `;
  }
  html += '</div>';
  return html;
};

// --- 🔥 Show Detail (SweetAlert2) ---
const showDetail = (item) => {
  const formattedDate = `${formatDate(item.created_at)} เวลา ${formatTime(item.created_at)}`;
  const score = calculateRealAverage(item);
  const topicListHTML = generateTopicListHTML(item.answers);
  
  Swal.fire({
    title: `<div class="text-lg font-bold text-gray-800 text-left p-4">${item.locations?.locations_name}</div>`,
    html: `
      <div class="text-left font-sans max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        
        <div class="flex items-center gap-2 mb-4 text-gray-600 text-xs">
           <span class="bg-gray-100 px-2 py-1 rounded">อาคาร ${item.locations?.locations_building || '-'}</span>
           <span class="bg-gray-100 px-2 py-1 rounded">ชั้น ${item.locations?.locations_floor || '-'}</span>
           <span class="text-gray-400 ml-auto">${formattedDate}</span>
        </div>

        <div class="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-100 rounded-xl mb-4">
           <span class="font-bold text-indigo-900 text-sm">ความพึงพอใจโดยรวม</span>
           <div class="flex items-center gap-2">
              <span class="text-3xl font-bold text-indigo-600">${score}</span>
              <div class="text-xs text-indigo-400 flex flex-col items-center leading-none">
                <span>คะแนน</span>
                <span>เฉลี่ย</span>
              </div>
           </div>
        </div>

        <div class="mb-4">
           <label class="block text-xs font-bold text-gray-500 uppercase mb-2">คะแนนรายหัวข้อ (Breakdown)</label>
           <div class="bg-white p-3 rounded-xl border border-gray-200">
              ${topicListHTML}
           </div>
        </div>

        <div>
           <label class="block text-xs font-bold text-gray-500 uppercase mb-2">ข้อเสนอแนะเพิ่มเติม</label>
           <div class="bg-gray-50 p-4 rounded-xl border border-gray-100 text-gray-700 text-sm leading-relaxed min-h-[60px]">
              ${item.comment || '<span class="text-gray-400 italic">ไม่มีข้อเสนอแนะ</span>'}
           </div>
        </div>

      </div>
    `,
    showConfirmButton: true,
    confirmButtonText: 'ปิด',
    confirmButtonColor: '#374151', // สีเทาเข้ม
    customClass: {
      popup: '',
      title: 'p-0', 
      htmlContainer: 'm-0 p-4'
    },
    width: '400px',
    padding: '0'
  });
};
</script>

<template>
  <div class="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-screen relative">
    
    <div class="p-6 border-b border-gray-50 flex justify-between items-center shrink-0">
      <div class="flex items-center gap-3">
        <h3 class="font-bold text-gray-800 text-xl">รายการประเมินล่าสุด</h3>
      </div>
      <span class="text-sm font-bold text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full border border-indigo-100">
        รวม {{ totalItems }} รายการ
      </span>
    </div>

    <div class="overflow-y-auto custom-scrollbar flex-1">
      <table class="w-full text-left border-collapse relative"> 
        <thead class="bg-gray-50 text-sm text-gray-600 uppercase font-bold tracking-wider sticky top-0 z-10 shadow-sm">
          <tr>
            <th class="px-5 py-5 bg-gray-50 whitespace-nowrap w-[120px]">วันที่</th>
            <th class="px-5 py-5 bg-gray-50 text-center whitespace-nowrap w-[100px]">เวลา</th>
            <th class="px-5 py-5 bg-gray-50 whitespace-nowrap">จุดตรวจ </th> 
            <th class="px-5 py-5 bg-gray-50 text-center whitespace-nowrap w-[80px]">อาคาร</th>
            <th class="px-5 py-5 bg-gray-50 text-center whitespace-nowrap w-[80px]">ชั้น</th>
            <th class="px-5 py-5 text-center bg-gray-50 whitespace-nowrap w-[100px]">คะแนน</th>
            <th class="px-5 py-5 bg-gray-50 text-right whitespace-nowrap w-[80px]">เพิ่มเติม</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-gray-50 text-base">
          <tr v-if="paginatedFeedbacks.length === 0">
             <td colspan="7" class="px-6 py-24 text-center text-gray-400">
                <div class="flex flex-col items-center gap-3">
                   <Inbox class="w-12 h-12 text-gray-300" />
                   <span class="text-lg">ไม่พบข้อมูลในหน้านี้</span>
                </div>
             </td>
          </tr>

          <tr v-for="item in paginatedFeedbacks" :key="item.id" class="hover:bg-gray-50/50 transition-colors">
            
            <td class="px-5 py-5 text-gray-700 whitespace-nowrap">
              <div class="flex items-center gap-2.5">
                <Calendar class="w-5 h-5 text-gray-400" /> 
                {{ formatDate(item.created_at) }}
              </div>
            </td>

            <td class="px-5 py-5 text-center whitespace-nowrap">
              <div class="inline-flex items-center gap-2 px-3 py-1.5 text-gray-700 bg-gray-50 rounded-lg border border-gray-100">
                 <Clock class="w-4 h-4 text-indigo-500" />
                 <span class="font-mono font-medium">{{ formatTime(item.created_at) }}</span>
              </div>
            </td>

            <td class="px-5 py-5 whitespace-nowrap">
              <div class="flex flex-col">
                 <div class="font-bold text-gray-800 flex items-center gap-2 truncate max-w-[250px] sm:max-w-none text-base">
                    <MapPin class="w-5 h-5 text-indigo-500 shrink-0" />
                    <span class="truncate">{{ item.locations?.locations_name || '-' }}</span>
                 </div>
              </div>
            </td>

            <td class="px-5 py-5 text-center whitespace-nowrap">
               <div class="inline-flex items-center gap-1.5 text-gray-700 px-2 py-1">
                  <span class="font-medium">{{ item.locations?.locations_building || '-' }}</span>
               </div>
            </td>

            <td class="px-5 py-5 text-center whitespace-nowrap">
               <div class="inline-flex items-center justify-center min-w-[36px] h-[28px] text-gray-700 bg-gray-100 rounded-md text-sm font-bold">
                  {{ item.locations?.locations_floor || '-' }}
               </div>
            </td>
            
            <td class="px-5 py-5 text-center">
              <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold"
                :class="calculateRealAverage(item) >= 4 ? 'bg-green-50 text-green-700' : calculateRealAverage(item) >= 3 ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'">
                <Star class="w-4 h-4 fill-current" /> 
                {{ calculateRealAverage(item) }}
              </div>
            </td>

            <td class="px-5 py-5 text-right">
              <button 
                @click="showDetail(item)"
                class="text-gray-400 hover:text-indigo-600 transition-colors p-2.5 hover:bg-indigo-50 rounded-full group relative"
                title="ดูรายละเอียด"
              >
                <Eye class="w-5 h-5" />
                <span v-if="item.comment" class="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="p-5 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white rounded-b-2xl shrink-0 text-sm font-medium">
      <div class="flex items-center gap-4 text-gray-600">
        <span>แสดง {{ startEntry }} ถึง {{ endEntry }} จาก {{ totalItems }} รายการ</span>
        <div class="flex items-center gap-2">
          <span>แสดง:</span>
          <select 
            v-model="itemsPerPage" 
            class="border border-gray-200 rounded-lg py-1.5 px-3 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer bg-gray-50"
          >
            <option :value="5">5</option>
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
          </select>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button @click="changePage(currentPage - 1)" :disabled="currentPage === 1" class="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><ChevronLeft class="w-5 h-5" /></button>
        <template v-for="page in totalPages" :key="page">
          <button v-if="page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)" @click="changePage(page)" class="w-9 h-9 flex items-center justify-center rounded-lg font-medium transition-colors" :class="currentPage === page ? 'bg-indigo-600 text-white shadow-md' : 'border border-gray-200 hover:bg-gray-50 text-gray-700'">{{ page }}</button>
          <span v-else-if="page === currentPage - 2 || page === currentPage + 2" class="text-gray-400 px-1">...</span>
        </template>
        <button @click="changePage(currentPage + 1)" :disabled="currentPage === totalPages" class="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><ChevronRight class="w-5 h-5" /></button>
      </div>
    </div>

  </div>
</template>

<style>
/* CSS สำหรับ Custom Scrollbar ใน SweetAlert */
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }
</style>