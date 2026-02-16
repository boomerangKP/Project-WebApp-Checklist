<script setup>
import { Loader2, FileSpreadsheet } from "lucide-vue-next";
import { useSwal } from "@/composables/useSwal";
// ✅ 1. Import Composable ที่สร้างไว้
import { useExport } from "@/composables/useExport";

const props = defineProps({
  startDate: { type: String, default: "" },
  endDate: { type: String, default: "" },
});

const { Swal } = useSwal();
// ✅ 2. เรียกใช้ state และ function จาก Composable แทนการเขียนเอง
const { isExporting, runExport } = useExport();

const handleExport = async () => {
  // 1. Validation วันที่ (คงโครงสร้างเดิมไว้ตาม requirement)
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

  // ✅ 3. เรียกใช้ฟังก์ชันกลาง (แทนโค้ดยาวๆ เดิม)
  // ฟังก์ชันนี้จะจัดการทั้ง Dialog ยืนยัน, เรียก Edge Function, ดาวน์โหลดไฟล์ และแจ้งเตือนสำเร็จ
  await runExport({
    functionName: 'export-work-performance',
    startDate: startDateObj,
    endDate: endDateObj,
    filePrefix: 'รายงานการปฏิบัติงาน'
  });
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