<script setup>
import { ref } from 'vue';
import { supabase } from '@/lib/supabase';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Loader2, FileSpreadsheet } from 'lucide-vue-next';
import Swal from 'sweetalert2';

const props = defineProps({
  startDate: { type: String, default: '' },
  endDate: { type: String, default: '' }
});

const isExporting = ref(false);

const handleExport = async () => {
  try {
    // 1. กำหนดช่วงเวลา (Validation)
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
    
    const startDateTh = startDateObj.toLocaleDateString('th-TH', { dateStyle: 'long' });
    const endDateTh = endDateObj.toLocaleDateString('th-TH', { dateStyle: 'long' });

    // 2. ดึงข้อมูลจาก Supabase
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

    // Process Data (จัดกลุ่มข้อมูล)
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

    // 3. เริ่มสร้าง Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('รายงานสรุป');
    const thinBorder = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

    // --- Header & Subheader ---
    sheet.mergeCells('A1:M1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `รายงานสรุปการทำความสะอาด (Maid Report)`;
    titleCell.font = { size: 16, bold: true, name: 'Sarabun' };
    titleCell.alignment = { horizontal: 'center' };
    titleCell.border = thinBorder;

    sheet.mergeCells('A2:M2');
    const subtitleCell = sheet.getCell('A2');
    subtitleCell.value = `ช่วงวันที่: ${startDateTh} ถึง ${endDateTh}`;
    subtitleCell.font = { size: 12, name: 'Sarabun' };
    subtitleCell.alignment = { horizontal: 'center' };
    subtitleCell.border = thinBorder;

    // --- Table Header ---
    sheet.getRow(3).values = ['ลำดับ', 'รหัสงาน', 'วันที่', 'เวลาล่าสุด (เช้า)', 'เวลาล่าสุด (บ่าย)', 'ชื่อพนักงาน', 'อาคาร', 'ชั้น', 'จุดตรวจสอบ', 'สถานะล่าสุด', 'หมายเหตุ', 'เช้า (รอบ)', 'บ่าย (รอบ)'];
    
    // กำหนด Key ให้ Columns เพื่อใช้อ้างอิงตอน Auto Width
    sheet.columns = [
      { key: 'no' }, { key: 'id' }, { key: 'date' }, { key: 'timeMorning' }, { key: 'timeAfternoon' },
      { key: 'name' }, { key: 'building' }, { key: 'floor' }, { key: 'location' },
      { key: 'status' }, { key: 'remark' }, { key: 'morning' }, { key: 'afternoon' },
    ];

    const headerRow = sheet.getRow(3);
    headerRow.font = { bold: true, name: 'Sarabun' };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.eachCell((cell) => { cell.border = thinBorder; });

    // --- Body Rows ---
    const summaryArray = Object.values(summaryMap);
    summaryArray.forEach((item, index) => {
      const dateDisplay = new Date(item.dateRaw).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' });
      // แปลงชั้นเป็นตัวเลขถ้าทำได้ เพื่อไม่ให้ Excel แจ้งเตือน Number stored as Text
      const floorValue = isNaN(Number(item.floor)) ? item.floor : Number(item.floor);

      const row = sheet.addRow([
        index + 1, `#${item.id}`, dateDisplay,
        item.timeMorning, item.timeAfternoon,
        item.name, item.building, floorValue, item.location,
        translateStatus(item.status), item.remark,
        item.morningCount, item.afternoonCount
      ]);

      // จัดสีสถานะ
      const statusCell = row.getCell(10);
      if (['fail', 'rejected'].includes(item.status)) statusCell.font = { color: { argb: 'FFFF0000' }, bold: true };
      else if (['pass', 'approved', 'fixed'].includes(item.status)) statusCell.font = { color: { argb: 'FF008000' }, bold: true };
      else statusCell.font = { color: { argb: 'FFF59E0B' } };

      // จัดกึ่งกลางสำหรับคอลัมน์ทั่วไป
      [1, 2, 3, 4, 5, 7, 8, 12, 13].forEach(colIndex => row.getCell(colIndex).alignment = { horizontal: 'center', vertical: 'top' });
      
      // ตีเส้นขอบทุกเซลล์
      row.eachCell((cell) => { 
          cell.border = thinBorder; 
          cell.font = { ...cell.font, name: 'Sarabun' }; // บังคับ Font
      });
    });

    // ✅✅✅ AUTO WIDTH LOGIC (UPDATED) ✅✅✅
    sheet.columns.forEach((column) => {
      // 🔥 กรณีพิเศษ: คอลัมน์ "หมายเหตุ"
      if (column.key === 'remark') {
        column.width = 50; // กำหนดความกว้างตายตัว
        column.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' }; // สั่งตัดบรรทัด + ชิดบนซ้าย
      } 
      // กรณีทั่วไป: คำนวณความกว้างอัตโนมัติ
      else {
        let maxColumnLength = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
          if (cell.row <= 2) return; // ข้าม Header Title
          
          const cellValue = cell.value ? cell.value.toString() : '';
          const len = cellValue.length; 
          if (len > maxColumnLength) maxColumnLength = len;
        });
        
        // กำหนดความกว้าง (Minimum 10)
        column.width = Math.max(maxColumnLength + 2, 10);
        
        // ถ้าไม่ใช่หมายเหตุ ให้ใช้ alignment มาตรฐาน (ถ้ายังไม่ได้กำหนดไว้)
        if (!column.alignment) {
           column.alignment = { vertical: 'top', horizontal: 'left' };
        }
      }
    });

    // 4. Save File
    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `Maid_Report_${new Date().toISOString().slice(0,10)}.xlsx`;
    saveAs(new Blob([buffer]), fileName);

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