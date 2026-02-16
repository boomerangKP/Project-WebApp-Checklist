<script setup>
import { ref } from "vue";
import { supabase } from "@/lib/supabase";
import { Loader2, FileSpreadsheet } from "lucide-vue-next";
import { useSwal } from "@/composables/useSwal";

const props = defineProps({
  startDate: { type: String, default: "" },
  endDate: { type: String, default: "" },
});

const { Swal } = useSwal();
const isExporting = ref(false);

const handleExport = async () => {
  // 1. Validation วันที่
  const start =
    props.startDate ||
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const end = props.endDate || new Date().toISOString();

  const startDateObj = new Date(start);
  const endDateObj = new Date(end);
  const maxAllowedDate = new Date(startDateObj);
  maxAllowedDate.setMonth(maxAllowedDate.getMonth() + 4);

  if (endDateObj > maxAllowedDate) {
    Swal.fire({
      icon: "warning",
      title: "ช่วงเวลาเกินกำหนด",
      text: "ระบบอนุญาตให้ดาวน์โหลดข้อมูลได้สูงสุดครั้งละ 4 เดือน",
      confirmButtonText: "เข้าใจแล้ว",
    });
    return;
  }

  const startDateTh = startDateObj.toLocaleDateString("th-TH", { dateStyle: "long" });
  const endDateTh = endDateObj.toLocaleDateString("th-TH", { dateStyle: "long" });

  const confirmResult = await Swal.fire({
    title: "ยืนยันการดาวน์โหลด?",
    html: `
      ต้องการดาวน์โหลดรายงานตั้งแต่วันที่ <br/>
      <b class="text-indigo-600 dark:text-indigo-400">${startDateTh}</b> ถึง <b class="text-indigo-600 dark:text-indigo-400">${endDateTh}</b> <br/>
      ใช่หรือไม่?
    `,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "ใช่, ดาวน์โหลด",
    cancelButtonText: "ยกเลิก",
  });

  if (!confirmResult.isConfirmed) return;

  isExporting.value = true;

  try {
    const { data: { session } } = await supabase.auth.getSession();

    // ✅ เรียก Edge Function export-work-performance
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-work-performance`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        start: start,
        end: end
      })
    });

    if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Export failed from server');
    }

    // --- ✨ ส่วนจัดการชื่อไฟล์ภาษาไทย (แก้ไขใหม่) ✨ ---
    
    // ฟังก์ชันแปลงวันที่เป็นรูปแบบ: 01-มกราคม-2567
    const formatDateThaiFull = (date) => {
      const d = new Date(date);
      const day = d.getDate().toString().padStart(2, '0'); // 01
      const month = d.toLocaleDateString("th-TH", { month: 'long' }); // มกราคม
      const year = d.toLocaleDateString("th-TH", { year: 'numeric' }); // 2567
      return `${day}-${month}-${year}`; // รวมร่าง
    };

    // กำหนดชื่อไฟล์
    // ตัวอย่าง: รายงานการปฏิบัติงาน_01-มกราคม-2567_ถึง_31-มกราคม-2567.xlsx
    const fileName = `รายงานการปฏิบัติงาน_${formatDateThaiFull(startDateObj)}_ถึง_${formatDateThaiFull(endDateObj)}.xlsx`;

    // รับไฟล์ Blob
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    // ✅ ตั้งชื่อไฟล์ภาษาไทยที่นี่
    link.setAttribute('download', fileName);

    document.body.appendChild(link);
    link.click();

    link.remove();
    window.URL.revokeObjectURL(url);

    // ✅ แสดงชื่อไฟล์ใน Swal
    Swal.fire({
      icon: "success",
      title: "ดาวน์โหลดสำเร็จ",
      text: `ไฟล์ "${fileName}" ถูกบันทึกเรียบร้อยแล้ว`,
      showConfirmButton: "ปิดหน้าต่าง",
    });

  } catch (err) {
    console.error("Export Error:", err);
    Swal.fire("Error", `เกิดข้อผิดพลาด: ${err.message}`, "error");
  } finally {
    isExporting.value = false;
  }
};
</script>

<template>
  <button
    @click="handleExport"
    :disabled="isExporting"
    class="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed h-11 text-sm font-medium"
  >
    <Loader2 v-if="isExporting" class="w-4 h-4 animate-spin" />
    <FileSpreadsheet v-else class="w-4 h-4" />
    <span>{{ isExporting ? "กำลังสร้างไฟล์..." : "Export Excel" }}</span>
  </button>
</template>