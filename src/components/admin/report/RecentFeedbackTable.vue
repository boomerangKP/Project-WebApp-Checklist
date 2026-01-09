<script setup>
import { ref, computed, watch } from "vue";
import { Calendar, Star, Inbox, ChevronLeft, ChevronRight } from "lucide-vue-next";

const props = defineProps({ feedbacks: Array });

// --- State สำหรับ Pagination ---
const currentPage = ref(1);
const itemsPerPage = ref(10); // ค่าเริ่มต้น 10 รายการต่อหน้า

// รีเซ็ตกลับไปหน้า 1 เสมอเมื่อข้อมูลเปลี่ยน (เช่น เปลี่ยนวันที่กรอง)
watch(() => props.feedbacks, () => {
  currentPage.value = 1;
});

// --- Computed Logic ---
const totalItems = computed(() => props.feedbacks.length);
const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value) || 1);

// คำนวณรายการที่จะแสดงในหน้านั้นๆ
const paginatedFeedbacks = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return props.feedbacks.slice(start, end);
});

// คำนวณตัวเลข "แสดง X ถึง Y"
const startEntry = computed(() => totalItems.value === 0 ? 0 : (currentPage.value - 1) * itemsPerPage.value + 1);
const endEntry = computed(() => Math.min(currentPage.value * itemsPerPage.value, totalItems.value));

// ฟังก์ชันเปลี่ยนหน้า
const changePage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString("th-TH", {
    day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit"
  });
};

// 🔥 ฟังก์ชันคำนวณคะแนนเฉลี่ยจริง (Real-time Calculation)
const calculateRealAverage = (item) => {
  // 1. เช็คว่ามีข้อมูล answers และเป็น Object ไหม
  if (item.answers && typeof item.answers === 'object') {
    // ดึงเฉพาะคะแนนออกมาเป็น Array
    const scores = Object.values(item.answers).map(a => Number(a.rating || a) || 0);
    
    // กรองเอาเฉพาะที่มีคะแนน (>0)
    const validScores = scores.filter(s => s > 0);

    // ถ้ามีคะแนน ให้คำนวณค่าเฉลี่ย
    if (validScores.length > 0) {
      const total = validScores.reduce((sum, score) => sum + score, 0);
      
      // ✅ แก้ตรงนี้: คืนค่าทศนิยม 1 ตำแหน่ง (เช่น 3.9)
      return (total / validScores.length).toFixed(1); 
    }
  }

  // 2. ถ้าไม่มี answers ให้ใช้ rating เดิมจาก DB
  // ✅ แก้ตรงนี้: คืนค่าทศนิยม 1 ตำแหน่ง
  return Number(item.rating || 0).toFixed(1);
};
</script>

<template>
  <div class="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-screen">
    
    <div class="p-6 border-b border-gray-50 flex justify-between items-center shrink-0">
      <div class="flex items-center gap-2">
        <h3 class="font-bold text-gray-800 text-lg">รายการประเมินล่าสุด</h3>
      </div>
      <span class="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
        รวม {{ totalItems }} รายการ
      </span>
    </div>

    <div class="overflow-y-auto custom-scrollbar h-[500px] flex-1">
      <table class="w-full text-left border-collapse relative">
        <thead class="bg-gray-50 text-xs text-gray-500 uppercase font-bold tracking-wider sticky top-0 z-10 shadow-sm">
          <tr>
            <th class="px-6 py-4 bg-gray-50">วันที่ / เวลา</th>
            <th class="px-6 py-4 bg-gray-50">สถานที่</th>
            <th class="px-6 py-4 text-center bg-gray-50">คะแนน</th>
            <th class="px-6 py-4 bg-gray-50">ข้อเสนอแนะ</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-gray-50">
          <tr v-if="paginatedFeedbacks.length === 0">
             <td colspan="4" class="px-6 py-20 text-center text-gray-400">
                <div class="flex flex-col items-center gap-2">
                   <Inbox class="w-10 h-10 text-gray-300" />
                   <span>ไม่พบข้อมูลในหน้านี้</span>
                </div>
             </td>
          </tr>

          <tr v-for="item in paginatedFeedbacks" :key="item.id" class="hover:bg-gray-50/50 transition-colors">
            <td class="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
              <div class="flex items-center gap-2">
                <Calendar class="w-4 h-4 text-gray-400" />
                {{ formatDate(item.created_at) }}
              </div>
            </td>
            <td class="px-6 py-4">
              <div class="text-sm font-bold text-gray-800">{{ item.locations?.locations_name }}</div>
              <div class="text-xs text-gray-500">{{ item.locations?.locations_building }} ชั้น {{ item.locations?.locations_floor }}</div>
            </td>
            
            <td class="px-6 py-4 text-center">
              <div class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold"
                :class="calculateRealAverage(item) >= 4 ? 'bg-green-50 text-green-600' : calculateRealAverage(item) >= 3 ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-600'">
                
                <Star class="w-3 h-3 fill-current" /> 
                {{ calculateRealAverage(item) }}
                
              </div>
            </td>

            <td class="px-6 py-4 text-sm text-gray-600">
              <p v-if="item.comment" class="line-clamp-2 min-w-[200px]">"{{ item.comment }}"</p>
              <span v-else class="text-gray-300">-</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="p-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white rounded-b-2xl shrink-0 text-sm">
      
      <div class="flex items-center gap-4 text-gray-500">
        <span>แสดง {{ startEntry }} ถึง {{ endEntry }} จาก {{ totalItems }} รายการ</span>
        
        <div class="flex items-center gap-2">
          <span>แสดง:</span>
          <select 
            v-model="itemsPerPage" 
            class="border border-gray-200 rounded-lg py-1 px-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer bg-gray-50"
          >
            <option :value="5">5</option>
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
          </select>
        </div>
      </div>

      <div class="flex items-center gap-1">
        <button 
          @click="changePage(currentPage - 1)" 
          :disabled="currentPage === 1"
          class="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>

        <template v-for="page in totalPages" :key="page">
          <button 
            v-if="page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)"
            @click="changePage(page)"
            class="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors"
            :class="currentPage === page ? 'bg-indigo-600 text-white shadow-sm' : 'border border-gray-200 hover:bg-gray-50 text-gray-600'"
          >
            {{ page }}
          </button>
          <span v-else-if="page === currentPage - 2 || page === currentPage + 2" class="text-gray-400 px-1">...</span>
        </template>

        <button 
          @click="changePage(currentPage + 1)" 
          :disabled="currentPage === totalPages"
          class="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>

    </div>

  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e2e8f0; border-radius: 20px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #cbd5e1; }
</style>