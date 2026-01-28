<script setup>
import { ref } from "vue";
import { supabase } from "@/lib/supabase";
import { Loader2, FileSpreadsheet } from "lucide-vue-next";
import { useSwal } from "@/composables/useSwal";

// ✅ Polyfill Buffer
import * as XLSX_Standard from "xlsx";
if (typeof window !== "undefined") {
  window.Buffer = window.Buffer || { isBuffer: () => false };
}

const props = defineProps({
  startDate: { type: String, default: "" },
  endDate: { type: String, default: "" },
});

const { Swal } = useSwal();
const isExporting = ref(false);

const handleExport = async () => {
  // 1. Validation
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

  const confirmResult = await Swal.fire({
    title: "ยืนยันการดาวน์โหลด?",
    text: `ต้องการดาวน์โหลดรายงานตั้งแต่วันที่ ${startDateObj.toLocaleDateString(
      "th-TH",
      { dateStyle: "long" }
    )} ถึง ${endDateObj.toLocaleDateString("th-TH", { dateStyle: "long" })} ใช่หรือไม่?`,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "ใช่, ดาวน์โหลด",
    cancelButtonText: "ยกเลิก",
  });

  if (!confirmResult.isConfirmed) return;

  isExporting.value = true;

  try {
    // Dynamic Import
    let XLSX;
    try {
      const module = await import("xlsx-js-style");
      XLSX = module.default || module;
    } catch (e) {
      console.warn("xlsx-js-style load failed, falling back to standard xlsx");
      XLSX = XLSX_Standard;
    }

    const startDateTh = startDateObj.toLocaleDateString("th-TH", { dateStyle: "long" });
    const endDateTh = endDateObj.toLocaleDateString("th-TH", { dateStyle: "long" });

    // 2. Fetch Data
    // ✅ สำคัญ: ต้องเรียง ascending: true (เก่าไปใหม่) เพื่อให้นับ 1, 2, 3 ได้ถูกต้อง
    const { data: rawLogs, error } = await supabase
      .from("check_sessions")
      .select(
        `
        *,
        employees:employees!check_sessions_employees_id_fkey (
            employees_firstname,
            employees_lastname
        ),
        locations (
            locations_name,
            locations_building,
            locations_floor
        ),
        time_slots (
            time_slots_id,
            time_slots_name,
            time_slots_start,
            time_slots_order
        ),
        inspector:employees!check_sessions_checked_by_fkey (
            employees_firstname,
            employees_lastname
        )
        `
      )
      .gte("created_at", start)
      .lte("created_at", end)
      .order("created_at", { ascending: true }); // เก่า -> ใหม่

    if (error) throw error;
    if (!rawLogs || rawLogs.length === 0) {
      Swal.fire("ไม่พบข้อมูล", "ไม่มีข้อมูลในช่วงเวลาที่เลือก", "info");
      return;
    }

    // ------------------------------------------------------------------
    // ✅ LOGIC การนับครั้ง (Round Calculator)
    // ------------------------------------------------------------------
    const roundTracker = {}; // เก็บสถานะการนับ: { "วันที่_สถานที่_กะ": จำนวนครั้ง }

    rawLogs.forEach(log => {
        // 1. ระบุกะ (ตัดที่ 12:00 น.)
        let isMorning = true;
        const createdAt = new Date(log.created_at);
        if (log.time_slots && log.time_slots.time_slots_start) {
            const startH = parseInt(log.time_slots.time_slots_start.split(':')[0]);
            isMorning = startH < 12;
        } else {
            isMorning = createdAt.getHours() < 12;
        }

        // 2. สร้าง Key เพื่อแยกกลุ่มนับ
        // Key นี้จะทำให้ เช้า กับ บ่าย แยกกันนับคนละกอง (บ่ายเริ่ม 1 ใหม่)
        const shiftKey = isMorning ? 'M' : 'A';
        const groupKey = `${log.check_sessions_date}_${log.locations_id}_${shiftKey}`;

        // 3. เริ่มนับ
        if (!roundTracker[groupKey]) {
            roundTracker[groupKey] = 0;
        }
        roundTracker[groupKey]++; // เพิ่มลำดับทีละ 1

        // 4. แปะค่าที่คำนวณได้ ใส่กลับไปใน object
        log.calculated_round = roundTracker[groupKey];
        log.is_morning_calculated = isMorning;
    });
    // ------------------------------------------------------------------

    // 3. Process Data for Excel
    const rows = [];

    rawLogs.forEach((log) => {
      const logDate = new Date(log.check_sessions_date);
      const logDateStr = logDate.toLocaleDateString("th-TH", { day: '2-digit', month: '2-digit', year: 'numeric' });
      const createdAt = new Date(log.created_at);
      const timeStr = createdAt.toLocaleTimeString("th-TH", { hour: '2-digit', minute: '2-digit' });

      let checkDateStr = "-";
      let checkTimeStr = "-";
      let inspectorName = "-";

      if (['approved', 'rejected', 'fixed'].includes(log.check_sessions_status)) {
         const updateAt = new Date(log.updated_at || log.created_at);
         checkDateStr = updateAt.toLocaleDateString("th-TH", { day: '2-digit', month: '2-digit', year: 'numeric' });
         checkTimeStr = updateAt.toLocaleTimeString("th-TH", { hour: '2-digit', minute: '2-digit' });

         if (log.inspector) {
             inspectorName = `${log.inspector.employees_firstname} ${log.inspector.employees_lastname}`;
         } else {
             inspectorName = log.check_sessions_status === 'approved' ? 'Admin' : '-';
         }
      }

      const isMorning = log.is_morning_calculated;
      const roundNum = log.calculated_round; // ✅ ใช้ค่าที่คำนวณใหม่

      const statusTh = translateStatus(log.check_sessions_status);

      rows.push({
          id: log.check_sessions_id,
          dateRaw: log.check_sessions_date,
          date: logDateStr,
          empName: `${log.employees?.employees_firstname || ''} ${log.employees?.employees_lastname || ''}`.trim(),
          building: log.locations?.locations_building || '-',
          floor: isNaN(Number(log.locations?.locations_floor)) ? log.locations?.locations_floor : Number(log.locations?.locations_floor),
          location: log.locations?.locations_name || '-',

          round: roundNum, // 1, 2, 3... (รีเซ็ตเมื่อขึ้นบ่าย)

          timeMorning: isMorning ? timeStr : '-',
          timeAfternoon: !isMorning ? timeStr : '-',
          checkMorning: isMorning ? '✓' : '-',
          checkAfternoon: !isMorning ? '✓' : '-',
          status: statusTh,
          checkDate: checkDateStr,
          checkTime: checkTimeStr,
          inspector: inspectorName,
          remark: log.supervisor_comment || '-'
      });
    });

    // เรียงลำดับ Excel: วันที่ -> อาคาร -> ชั้น -> เวลา (เช้าไปบ่าย)
    rows.sort((a, b) => {
        if (a.dateRaw !== b.dateRaw) return a.dateRaw.localeCompare(b.dateRaw);
        if (a.building !== b.building) return a.building.localeCompare(b.building);
        if (a.floor !== b.floor) return a.floor - b.floor;

        // เรียงตามเวลา: เช้ามาก่อนบ่าย
        if (a.timeMorning !== '-' && b.timeMorning === '-') return -1;
        if (a.timeMorning === '-' && b.timeMorning !== '-') return 1;

        // ถ้าช่วงเดียวกัน เรียงตามครั้งที่
        return a.round - b.round;
    });

    // 4. Create Excel Data
    const ws_data = [
      [{ v: "รายงานสรุปการทำความสะอาด (Maid Report)" }],
      [{ v: `ช่วงวันที่: ${startDateTh} ถึง ${endDateTh}` }],
      [
        "ลำดับ", "รหัสงาน", "วัน/เดือน/ปี", "ชื่อพนักงาน", "อาคาร", "ชั้น", "ชื่อจุดตรวจ",
        "ประทับเวลาล่าสุด", "", "",
        "ช่วงการทำงาน", "",
        "สถานะการติดตามงาน", "", "", "",
        "หมายเหตุ"
      ],
      [
        "", "", "", "", "", "", "",
        "ครั้งที่", "เช้า", "บ่าย",
        "เช้า", "บ่าย",
        "สถานะ", "วัน/เดือน/ปี", "เวลา", "ผู้ตรวจ",
        ""
      ]
    ];

    rows.forEach((r, i) => {
      ws_data.push([
        i + 1, r.id, r.date, r.empName, r.building, r.floor, r.location,
        r.round, r.timeMorning, r.timeAfternoon, r.checkMorning, r.checkAfternoon,
        r.status, r.checkDate, r.checkTime, r.inspector, r.remark
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 16 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 16 } },
      { s: { r: 2, c: 0 }, e: { r: 3, c: 0 } },
      { s: { r: 2, c: 1 }, e: { r: 3, c: 1 } },
      { s: { r: 2, c: 2 }, e: { r: 3, c: 2 } },
      { s: { r: 2, c: 3 }, e: { r: 3, c: 3 } },
      { s: { r: 2, c: 4 }, e: { r: 3, c: 4 } },
      { s: { r: 2, c: 5 }, e: { r: 3, c: 5 } },
      { s: { r: 2, c: 6 }, e: { r: 3, c: 6 } },
      { s: { r: 2, c: 16 }, e: { r: 3, c: 16 } },
      { s: { r: 2, c: 7 }, e: { r: 2, c: 9 } },
      { s: { r: 2, c: 10 }, e: { r: 2, c: 11 } },
      { s: { r: 2, c: 12 }, e: { r: 2, c: 15 } },
    ];

    if (ws["!ref"] && XLSX.utils.decode_range) {
      const range = XLSX.utils.decode_range(ws["!ref"]);
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cell_address]) continue;
          if (!ws[cell_address].s) ws[cell_address].s = {};
          ws[cell_address].s = {
            font: { name: "TH Sarabun New", sz: 14 },
            alignment: { horizontal: "center", vertical: "center", wrapText: true },
            border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } },
          };
          if (R < 4) {
            ws[cell_address].s.font.bold = true;
            ws[cell_address].s.fill = { fgColor: { rgb: "EFEFEF" } };
            if (R === 0) ws[cell_address].s.font.sz = 18;
          }
        }
      }
    }

    ws["!cols"] = [
      { wch: 6 }, { wch: 8 }, { wch: 12 }, { wch: 20 }, { wch: 6 }, { wch: 5 }, { wch: 20 },
      { wch: 6 }, { wch: 8 }, { wch: 8 }, { wch: 6 }, { wch: 6 }, { wch: 12 },
      { wch: 12 }, { wch: 8 }, { wch: 15 }, { wch: 20 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Maid Report");
    const fileName = `Maid_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;

    // Manual Download (Blob)
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);

    Swal.fire({
      icon: "success",
      title: "ดาวน์โหลดสำเร็จ",
      showConfirmButton: false,
      timer: 1500,
    });

  } catch (err) {
    console.error(err);
    Swal.fire("Error", `เกิดข้อผิดพลาด: ${err.message}`, "error");
  } finally {
    isExporting.value = false;
  }
};

const translateStatus = (status) => {
  const map = {
    pass: "เรียบร้อย",
    approved: "ตรวจแล้ว",
    fixed: "แก้ไขแล้ว",
    fail: "พบปัญหา",
    rejected: "ปฏิเสธ",
    waiting: "รอตรวจ",
  };
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
    <span>{{ isExporting ? "Creating..." : "Export Excel" }}</span>
  </button>
</template>
