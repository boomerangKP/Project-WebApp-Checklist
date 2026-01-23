<script setup>
import { ref } from "vue";
import { supabase } from "@/lib/supabase";
import { Loader2, FileSpreadsheet } from "lucide-vue-next";
import { useSwal } from "@/composables/useSwal"; // ✅ 1. ใช้ useSwal

const props = defineProps({
  startDate: { type: String, default: "" },
  endDate: { type: String, default: "" },
});

// ✅ 2. เรียกใช้ Swal ธีม Dark Mode
const { Swal } = useSwal();

const isExporting = ref(false);

const handleExport = async () => {
  // 1. Validation ช่วงเวลา (เช็คก่อนถาม)
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

  // ✅✅ เพิ่ม: ถามยืนยันก่อนดาวน์โหลด (Confirm Dialog) ✅✅
  const confirmResult = await Swal.fire({
    title: "ยืนยันการดาวน์โหลด?",
    text: "ต้องการส่งออกรายงานสรุปการทำความสะอาดเป็นไฟล์ Excel หรือไม่?",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "ใช่, ดาวน์โหลดเลย",
    cancelButtonText: "ยกเลิก",
    // ไม่ต้องกำหนดสีปุ่ม เพราะมันจะดึงจาก Theme กลางมาใช้เอง
  });

  // ถ้ากด Cancel ให้จบการทำงานตรงนี้เลย
  if (!confirmResult.isConfirmed) return;

  // --- เริ่มกระบวนการ Export ---
  isExporting.value = true; // หมุนติ้วๆ

  try {
    // 2. Dynamic Import
    let XLSX;
    try {
      XLSX = await import("xlsx-js-style");
    } catch (e) {
      console.warn("xlsx-js-style load failed, falling back to standard xlsx");
      XLSX = await import("xlsx");
    }

    const startDateTh = startDateObj.toLocaleDateString("th-TH", { dateStyle: "long" });
    const endDateTh = endDateObj.toLocaleDateString("th-TH", { dateStyle: "long" });

    // 3. ดึงข้อมูลจาก Supabase
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
            time_slots_name,
            time_slots_start
        )
        `
      )
      .gte("created_at", start)
      .lte("created_at", end)
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!rawLogs || rawLogs.length === 0) {
      Swal.fire("ไม่พบข้อมูล", "ไม่มีข้อมูลในช่วงเวลาที่เลือก", "info");
      return;
    }

    // 4. Process Data
    const summaryMap = {};
    rawLogs.forEach((log) => {
      const dateRaw = log.check_sessions_date;
      const locId = log.locations_id;
      const empId = log.employees_id;
      const key = `${dateRaw}_${locId}_${empId}`;

      const logTimeObj = new Date(log.created_at);
      const timeString = logTimeObj.toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
      });

      let isMorning = true;
      if (log.time_slots && log.time_slots.time_slots_start) {
        const startHour = parseInt(log.time_slots.time_slots_start.split(":")[0]);
        isMorning = startHour < 12;
      } else {
        isMorning = logTimeObj.getHours() < 12;
      }

      if (!summaryMap[key]) {
        summaryMap[key] = {
          id: log.check_sessions_id,
          dateRaw: dateRaw,
          timeMorning: "-",
          timeAfternoon: "-",
          name: `${log.employees?.employees_firstname || ""} ${
            log.employees?.employees_lastname || ""
          }`.trim(),
          building: log.locations?.locations_building || "-",
          floor: log.locations?.locations_floor || "-",
          location: log.locations?.locations_name || "-",
          status: log.check_sessions_status,
          remark: log.supervisor_comment || "-",
          morningCount: 0,
          afternoonCount: 0,
        };
      }

      if (isMorning) {
        summaryMap[key].morningCount++;
        if (summaryMap[key].timeMorning === "-") summaryMap[key].timeMorning = timeString;
      } else {
        summaryMap[key].afternoonCount++;
        if (summaryMap[key].timeAfternoon === "-")
          summaryMap[key].timeAfternoon = timeString;
      }
    });

    // 5. สร้างข้อมูล Excel
    const ws_data = [
      [{ v: "รายงานสรุปการทำความสะอาด (Maid Report)" }],
      [{ v: `ช่วงวันที่: ${startDateTh} ถึง ${endDateTh}` }],
      [
        "ลำดับ",
        "รหัสงาน",
        "วัน/เดือน/ปี",
        "ชื่อพนักงาน",
        "อาคาร",
        "ชั้น",
        "ชื่อจุดตรวจ",
        "สถานะการ\nติดตามงาน",
        "ประทับเวลาล่าสุด",
        "",
        "ช่วงการทำงาน",
        "",
        "หมายเหตุ",
      ],
      ["", "", "", "", "", "", "", "", "เช้า", "บ่าย", "เช้า", "บ่าย", ""],
    ];

    Object.values(summaryMap).forEach((item, index) => {
      const dateDisplay = new Date(item.dateRaw).toLocaleDateString("th-TH", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const floorValue = isNaN(Number(item.floor)) ? item.floor : Number(item.floor);
      const workMorning = item.morningCount > 0 ? "✓" : "-";
      const workAfternoon = item.afternoonCount > 0 ? "✓" : "-";

      ws_data.push([
        index + 1,
        item.id,
        dateDisplay,
        item.name,
        item.building,
        floorValue,
        item.location,
        translateStatus(item.status),
        item.timeMorning,
        item.timeAfternoon,
        workMorning,
        workAfternoon,
        item.remark,
      ]);
    });

    // 6. สร้าง Worksheet
    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 12 } },
      { s: { r: 2, c: 0 }, e: { r: 3, c: 0 } },
      { s: { r: 2, c: 1 }, e: { r: 3, c: 1 } },
      { s: { r: 2, c: 2 }, e: { r: 3, c: 2 } },
      { s: { r: 2, c: 3 }, e: { r: 3, c: 3 } },
      { s: { r: 2, c: 4 }, e: { r: 3, c: 4 } },
      { s: { r: 2, c: 5 }, e: { r: 3, c: 5 } },
      { s: { r: 2, c: 6 }, e: { r: 3, c: 6 } },
      { s: { r: 2, c: 7 }, e: { r: 3, c: 7 } },
      { s: { r: 2, c: 8 }, e: { r: 2, c: 9 } },
      { s: { r: 2, c: 10 }, e: { r: 2, c: 11 } },
      { s: { r: 2, c: 12 }, e: { r: 3, c: 12 } },
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
            border: {
              top: { style: "thin" },
              bottom: { style: "thin" },
              left: { style: "thin" },
              right: { style: "thin" },
            },
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
      { wch: 6 },
      { wch: 10 },
      { wch: 12 },
      { wch: 20 },
      { wch: 8 },
      { wch: 6 },
      { wch: 20 },
      { wch: 15 },
      { wch: 10 },
      { wch: 10 },
      { wch: 8 },
      { wch: 8 },
      { wch: 25 },
    ];

    ws["!rows"] = [{ hpt: 35 }, { hpt: 30 }, { hpt: 25 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Maid Report");

    const fileName = `Maid_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);

    Swal.fire({
      icon: "success",
      title: "ดาวน์โหลดสำเร็จ",
      text: `ไฟล์ ${fileName} ถูกบันทึกลงในเครื่องของคุณแล้ว`,
      showConfirmButton: false,
      timer: 1500,
    });
  } catch (err) {
    console.error(err);
    Swal.fire("Error", err.message, "error");
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
