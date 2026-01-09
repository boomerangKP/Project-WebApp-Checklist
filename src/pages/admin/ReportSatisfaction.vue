<script setup>
import { Heart, Loader2, Download } from "lucide-vue-next";
import { useReportSatisfaction } from "@/composables/useReportSatisfaction";
import Swal from "sweetalert2";

// Components
import StatsCards from "@/components/admin/report/StatsCards.vue";
import FeedbackCharts from "@/components/admin/report/FeedbackCharts.vue";
import RecentFeedbackTable from "@/components/admin/report/RecentFeedbackTable.vue";

const { 
  loading, feedbacks, dateFilter, stats, 
  trendChartData, topicChartData, exportToExcel 
} = useReportSatisfaction();

// 🔥 ฟังก์ชันยืนยันและดาวน์โหลด
const confirmExport = () => {
  // 1. เช็คข้อมูลก่อน
  const count = feedbacks.value.length;
  if (count === 0) {
    Swal.fire({
      icon: 'warning',
      title: 'ไม่มีข้อมูล',
      text: 'ไม่พบรายการข้อมูลในช่วงเวลาที่เลือก',
      confirmButtonText: 'ตกลง'
    });
    return;
  }

  // 2. แปลงชื่อช่วงเวลา
  const filterNames = {
    today: 'ประจำวันนี้',
    week: 'ประจำสัปดาห์นี้',
    month: 'ประจำเดือนนี้',
    all: 'ทั้งหมด'
  };
  const filterText = filterNames[dateFilter.value] || 'ทั้งหมด';

  // 3. ถามยืนยัน
  Swal.fire({
    title: 'ยืนยันการดาวน์โหลด?',
    html: `
      คุณต้องการดาวน์โหลดรายงาน <b>"${filterText}"</b> <br/>
      จำนวนทั้งสิ้น <b style="color: #059669; font-size: 1.2em;">${count}</b> รายการ
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#059669',
    cancelButtonColor: '#d33',
    confirmButtonText: 'ใช่, ดาวน์โหลดเลย',
    cancelButtonText: 'ยกเลิก'
  }).then((result) => {
    if (result.isConfirmed) {
      // 🚀 สั่งดาวน์โหลด
      exportToExcel();
      
      // ✅ แจ้งเตือนเมื่อเสร็จสิ้น
      Swal.fire({
        icon: 'success',
        title: 'ดาวน์โหลดเรียบร้อย!',
        text: 'ไฟล์ Excel ถูกบันทึกลงในเครื่องของคุณแล้ว',
        timer: 2000, // ปิดเองใน 2 วิ
        showConfirmButton: false
      });
    }
  });
};
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
        
        <button 
          @click="confirmExport" 
          class="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium shadow-sm transition-all active:scale-95"
        >
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