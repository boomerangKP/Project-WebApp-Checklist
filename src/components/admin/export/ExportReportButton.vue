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
  // 1. Validation (คงเดิม)
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
    // Dynamic Import
    let XLSX;
    try {
      const module = await import("xlsx-js-style");
      XLSX = module.default || module;
    } catch (e) {
      console.warn("xlsx-js-style load failed, falling back to standard xlsx");
      XLSX = XLSX_Standard;
    }

    // 2. Fetch Data (คงเดิม)
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
      .order("created_at", { ascending: true });

    if (error) throw error;
    if (!rawLogs || rawLogs.length === 0) {
      Swal.fire("ไม่พบข้อมูล", "ไม่มีข้อมูลในช่วงเวลาที่เลือก", "info");
      return;
    }

    // ------------------------------------------------------------------
    // ✅ 3. Process Data (ปรับใหม่ให้ตรงตามภาพ)
    // ------------------------------------------------------------------
    const roundTracker = {};
    const rows = [];

    rawLogs.forEach(log => {
        // คำนวณกะและรอบ (คงเดิม)
        let isMorning = true;
        const createdAt = new Date(log.created_at);
        if (log.time_slots && log.time_slots.time_slots_start) {
            const startH = parseInt(log.time_slots.time_slots_start.split(':')[0]);
            isMorning = startH < 12;
        } else {
            isMorning = createdAt.getHours() < 12;
        }

        const shiftKey = isMorning ? 'M' : 'A';
        const groupKey = `${log.check_sessions_date}_${log.locations_id}_${shiftKey}`;

        if (!roundTracker[groupKey]) {
            roundTracker[groupKey] = 0;
        }
        roundTracker[groupKey]++;

        // เตรียมข้อมูลแสดงผล
        const logDate = new Date(log.check_sessions_date);
        const logDateStr = logDate.toLocaleDateString("th-TH", { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = createdAt.toLocaleTimeString("th-TH", { hour: '2-digit', minute: '2-digit' });

        // ข้อมูลการตรวจ (Inspector info)
        let checkDateStr = "";
        let checkTimeStr = "";
        let inspectorName = "";

        if (['approved', 'rejected', 'fixed'].includes(log.check_sessions_status)) {
             const updateAt = new Date(log.updated_at || log.created_at);
             checkDateStr = updateAt.toLocaleDateString("th-TH", { day: '2-digit', month: '2-digit', year: 'numeric' });
             checkTimeStr = updateAt.toLocaleTimeString("th-TH", { hour: '2-digit', minute: '2-digit' });

             if (log.inspector) {
                 inspectorName = `${log.inspector.employees_firstname} ${log.inspector.employees_lastname}`;
             } else {
                 inspectorName = log.check_sessions_status === 'approved' ? 'Admin' : '';
             }
        }

        const statusTh = translateStatus(log.check_sessions_status);

        // ✅ Push ข้อมูลแบบ 1 Row ต่อ 1 Transaction (ตามภาพ)
        rows.push({
            id: log.check_sessions_id,
            dateRaw: log.check_sessions_date, // ไว้สำหรับ Sort
            createdAtRaw: createdAt, // ไว้สำหรับ Sort

            // Column A-G
            date: logDateStr,
            empName: `${log.employees?.employees_firstname || ''} ${log.employees?.employees_lastname || ''}`.trim(),
            building: log.locations?.locations_building || '-',
            floor: isNaN(Number(log.locations?.locations_floor)) ? log.locations?.locations_floor : Number(log.locations?.locations_floor),
            location: log.locations?.locations_name || '-',

            // Column H-J (ข้อมูลงานทำความสะอาด)
            round: roundTracker[groupKey],
            timestamp: timeStr,
            shift: isMorning ? 'เช้า' : 'บ่าย',

            // Column K-N (ข้อมูลติดตามงาน)
            status: statusTh,
            checkDate: checkDateStr,
            checkTime: checkTimeStr,
            inspector: inspectorName,

            // Column O
            remark: log.supervisor_comment || ''
        });
    });

    // เรียงลำดับ Excel: วันที่ -> อาคาร -> ชั้น -> เวลา
    rows.sort((a, b) => {
        if (a.dateRaw !== b.dateRaw) return a.dateRaw.localeCompare(b.dateRaw);
        if (a.building !== b.building) return a.building.localeCompare(b.building);
        if (a.floor !== b.floor) return a.floor - b.floor;
        return a.createdAtRaw - b.createdAtRaw; // เรียงตามเวลาที่เกิดขึ้นจริง
    });

    // ------------------------------------------------------------------
    // ✅ 4. Create Excel Layout (ปรับ Header ตามภาพ)
    // ------------------------------------------------------------------
    const ws_data = [
      [{ v: "รายงานสรุปการทำความสะอาด (Maid Report)" }],
      [{ v: `ช่วงวันที่: ${startDateTh} ถึง ${endDateTh}` }],
      // Header Row 1 (Main Headers)
      [
        "ลำดับ", "รหัสงาน", "วัน/เดือน/ปี", "ชื่อพนักงาน", "อาคาร", "ชั้น", "ชื่อจุดตรวจ",
        "ข้อมูลงานทำความสะอาด", "", "", // H, I, J
        "ข้อมูลติดตามงาน", "", "", "",  // K, L, M, N
        "หมายเหตุ" // O
      ],
      // Header Row 2 (Sub Headers)
      [
        "", "", "", "", "", "", "", // Skip A-G
        "ครั้งที่", "ประทับเวลา", "ช่วงการทำงาน", // Sub H-J
        "สถานะ", "วัน/เดือน/ปี", "เวลา", "ชื่อผู้ตรวจ", // Sub K-N
        "" // Skip O
      ]
    ];

    // ใส่ข้อมูล
    rows.forEach((r, i) => {
      ws_data.push([
        i + 1, r.id, r.date, r.empName, r.building, r.floor, r.location,
        r.round, r.timestamp, r.shift,
        r.status, r.checkDate, r.checkTime, r.inspector,
        r.remark
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // ✅ กำหนดการ Merge Cells (ปรับใหม่ตามภาพ)
    ws["!merges"] = [
      // Title Row 1 & 2
      { s: { r: 0, c: 0 }, e: { r: 0, c: 14 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 14 } },

      // Merge Vertical (A-G) ลำดับ ถึง จุดตรวจ
      { s: { r: 2, c: 0 }, e: { r: 3, c: 0 } },
      { s: { r: 2, c: 1 }, e: { r: 3, c: 1 } },
      { s: { r: 2, c: 2 }, e: { r: 3, c: 2 } },
      { s: { r: 2, c: 3 }, e: { r: 3, c: 3 } },
      { s: { r: 2, c: 4 }, e: { r: 3, c: 4 } },
      { s: { r: 2, c: 5 }, e: { r: 3, c: 5 } },
      { s: { r: 2, c: 6 }, e: { r: 3, c: 6 } },

      // Merge Horizontal Group Headers
      { s: { r: 2, c: 7 }, e: { r: 2, c: 9 } },  // ข้อมูลงานทำความสะอาด (ครอบ 3 คอลัมน์)
      { s: { r: 2, c: 10 }, e: { r: 2, c: 13 } }, // ข้อมูลติดตามงาน (ครอบ 4 คอลัมน์)

      // Merge Vertical (O) หมายเหตุ
      { s: { r: 2, c: 14 }, e: { r: 3, c: 14 } },
    ];

    // ✅ Styling
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

          // Header Styles
          if (R < 4) {
            ws[cell_address].s.font.bold = true;
            ws[cell_address].s.fill = { fgColor: { rgb: "EFEFEF" } };
            if (R === 0) ws[cell_address].s.font.sz = 18; // Title ใหญ่
            if (R === 1) ws[cell_address].s.alignment.horizontal = "left"; // วันที่ชิดซ้าย
          }
        }
      }
    }

    // กำหนดความกว้างคอลัมน์
    ws["!cols"] = [
      { wch: 6 },  // ลำดับ
      { wch: 8 },  // รหัสงาน
      { wch: 12 }, // วันที่
      { wch: 20 }, // พนักงาน
      { wch: 6 },  // อาคาร
      { wch: 5 },  // ชั้น
      { wch: 20 }, // จุดตรวจ
      { wch: 6 },  // ครั้งที่
      { wch: 10 }, // ประทับเวลา
      { wch: 10 }, // ช่วงการทำงาน
      { wch: 12 }, // สถานะ
      { wch: 12 }, // วันที่ตรวจ
      { wch: 8 },  // เวลาตรวจ
      { wch: 15 }, // ผู้ตรวจ
      { wch: 20 }, // หมายเหตุ
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Maid Report");
    const fileName = `Maid_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;

    // Download
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
    pass: "รอดรวจ", // ตามภาพเขียนว่า รอดรวจ (หรือ รอตรวจ)
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
