<script setup>
import { ref } from 'vue';
import { supabase } from '@/lib/supabase';
// ❌ ลบ exceljs และ file-saver ออก ไม่ต้องใช้แล้ว
import { Loader2, FileSpreadsheet } from 'lucide-vue-next';
import Swal from 'sweetalert2';

const props = defineProps({
  startDate: { type: String, default: '' },
  endDate: { type: String, default: '' }
});

const isExporting = ref(false);

const handleExport = async () => {
  try {
    // 1. Validation ช่วงเวลา (เหมือนเดิม)
    const start = props.startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const end = props.endDate || new Date().toISOString();

    const startDateObj = new Date(start);
    const endDateObj = new Date(end);

    const maxAllowedDate = new Date(startDateObj);
    maxAllowedDate.setMonth(maxAllowedDate.getMonth() + 4);

    if (endDateObj > maxAllowedDate) {
      Swal.fire({
        icon: 'warning',
        title: 'ช่วงเวลาเกินกำหนด',
        text: 'ระบบอนุญาตให้ดาวน์โหลดข้อมูลได้สูงสุดครั้งละ 4 เดือนเท่านั้นครับ',
        confirmButtonColor: '#f59e0b',
        confirmButtonText: 'เข้าใจแล้ว'
      });
      return;
    }

    isExporting.value = true;

    // ✅ 2. Dynamic Import: โหลด xlsx เฉพาะตอนกดปุ่ม
    // ไม่ต้องใช้ file-saver แล้ว เพราะ xlsx มี writeFile ในตัว
    const XLSX = await import('xlsx');

    const startDateTh = startDateObj.toLocaleDateString('th-TH', { dateStyle: 'long' });
    const endDateTh = endDateObj.toLocaleDateString('th-TH', { dateStyle: 'long' });

    // 3. ดึงข้อมูลจาก Supabase (เหมือนเดิม)
    const { data: rawLogs, error } = await supabase
      .from('check_sessions')
      .select(`*, employees (employees_firstname, employees_lastname), locations (locations_name, locations_building, locations_floor)`)
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!rawLogs || rawLogs.length === 0) {
      Swal.fire('ไม่พบข้อมูล', 'ไม่มีข้อมูลในช่วงเวลาที่เลือก', 'info');
      return;
    }

    // 4. Process Data: เตรียมข้อมูลใส่ Array (Logic เดิม)
    const summaryMap = {};
    rawLogs.forEach((log) => {
      const dateRaw = log.check_sessions_date;
      const locId = log.locations_id;
      const empId = log.employees_id;
      const key = `${dateRaw}_${locId}_${empId}`;

      const logTimeObj = new Date(log.created_at);
      const timeString = logTimeObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      const isMorning = logTimeObj.getHours() < 12;

      if (!summaryMap[key]) {
         summaryMap[key] = {
           id: log.check_sessions_id,
           dateRaw: dateRaw,
           timeMorning: '-',
           timeAfternoon: '-',
           name: `${log.employees?.employees_firstname || ''} ${log.employees?.employees_lastname || ''}`.trim(),
           building: log.locations?.locations_building || '-',
           floor: log.locations?.locations_floor || '-',
           location: log.locations?.locations_name || '-',
           status: log.check_sessions_status,
           remark: log.supervisor_comment || '-',
           morningCount: 0,
           afternoonCount: 0
         };
      }

      if (isMorning) {
        summaryMap[key].morningCount++;
        if (summaryMap[key].timeMorning === '-') summaryMap[key].timeMorning = timeString;
      } else {
        summaryMap[key].afternoonCount++;
        if (summaryMap[key].timeAfternoon === '-') summaryMap[key].timeAfternoon = timeString;
      }
    });

    // 5. สร้าง Array of Arrays สำหรับ XLSX
    // [ [Header 1], [Header 2], [Col1, Col2, Col3], [Data...] ]
    const ws_data = [];

    // หัวกระดาษ (Header Rows)
    ws_data.push([`รายงานสรุปการทำความสะอาด (Maid Report)`]);
    ws_data.push([`ช่วงวันที่: ${startDateTh} ถึง ${endDateTh}`]);
    ws_data.push([
      'ลำดับ', 'รหัสงาน', 'วันที่', 'เวลาล่าสุด (เช้า)', 'เวลาล่าสุด (บ่าย)',
      'ชื่อพนักงาน', 'อาคาร', 'ชั้น', 'จุดตรวจสอบ',
      'สถานะล่าสุด', 'หมายเหตุ', 'เช้า (รอบ)', 'บ่าย (รอบ)'
    ]);

    // ข้อมูล (Data Rows)
    Object.values(summaryMap).forEach((item, index) => {
      const dateDisplay = new Date(item.dateRaw).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' });
      // แปลงชั้นเป็นตัวเลขถ้าทำได้
      const floorValue = isNaN(Number(item.floor)) ? item.floor : Number(item.floor);

      ws_data.push([
        index + 1,
        item.id,
        dateDisplay,
        item.timeMorning,
        item.timeAfternoon,
        item.name,
        item.building,
        floorValue,
        item.location,
        translateStatus(item.status),
        item.remark,
        item.morningCount,
        item.afternoonCount
      ]);
    });

    // 6. สร้าง Workbook และ Worksheet ด้วย xlsx
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();

    // จัดความกว้างคอลัมน์นิดหน่อย (Optional) เพื่อให้อ่านง่าย
    ws['!cols'] = [
      { wch: 6 },  // ลำดับ
      { wch: 10 }, // รหัสงาน
      { wch: 15 }, // วันที่
      { wch: 15 }, // เวลาเช้า
      { wch: 15 }, // เวลาบ่าย
      { wch: 20 }, // ชื่อ
      { wch: 10 }, // อาคาร
      { wch: 8 },  // ชั้น
      { wch: 25 }, // จุดตรวจสอบ
      { wch: 15 }, // สถานะ
      { wch: 30 }, // หมายเหตุ
      { wch: 10 }, // รอบเช้า
      { wch: 10 }  // รอบบ่าย
    ];

    // Merge Cells สำหรับ Title (A1 ถึง M1 และ A2 ถึง M2)
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 12 } }
    ];

    XLSX.utils.book_append_sheet(wb, ws, "รายงานสรุป");

    // 7. Download File
    const fileName = `Maid_Report_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(wb, fileName);

    Swal.fire({ icon: 'success', title: 'ดาวน์โหลดสำเร็จ', showConfirmButton: false, timer: 1500 });

  } catch (err) {
    console.error(err);
    Swal.fire('Error', err.message, 'error');
  } finally {
    isExporting.value = false;
  }
};

const translateStatus = (status) => {
  const map = { pass: 'ตรวจแล้ว', approved: 'ตรวจแล้ว', fail: 'แก้ไข', rejected: 'แก้ไข', fixed: 'แก้ไขแล้ว', waiting: 'รอตรวจ' };
  return map[status] || status;
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
    <span>{{ isExporting ? 'Creating...' : 'Export Excel' }}</span>
  </button>
</template>
