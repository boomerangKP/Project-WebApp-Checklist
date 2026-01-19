<script setup>
import { ref } from "vue";
import { supabase } from "@/lib/supabase";
import { Loader2, FileSpreadsheet } from "lucide-vue-next";
import Swal from "sweetalert2";

const props = defineProps({
  startDate: { type: String, default: "" },
  endDate: { type: String, default: "" },
});

const isExporting = ref(false);

const handleExport = async () => {
  try {
    // 1. Validation ช่วงเวลา
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
        confirmButtonColor: "#f59e0b",
        confirmButtonText: "เข้าใจแล้ว",
      });
      return;
    }

    isExporting.value = true;

    // 2. Dynamic Import (แก้ปัญหา stream error)
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
    // 🔥 แก้ไข: เพิ่ม time_slots และระบุ FK employees ให้ชัดเจน
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

    // 4. Process Data: เตรียมข้อมูล
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

      // ✅ Logic ใหม่: เช็คจาก time_slots ให้ตรงกับตารางหน้าเว็บ
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

    // 5. สร้างข้อมูล Excel (โครงสร้างเดิมเป๊ะ)
    const ws_data = [
      // Row 1: Title
      [{ v: "รายงานสรุปการทำความสะอาด (Maid Report)" }],
      // Row 2: Date
      [{ v: `ช่วงวันที่: ${startDateTh} ถึง ${endDateTh}` }],
      // Row 3: Main Headers
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
        "", // คลุม I, J
        "ช่วงการทำงาน",
        "", // คลุม K, L
        "หมายเหตุ",
      ],
      // Row 4: Sub Headers
      ["", "", "", "", "", "", "", "", "เช้า", "บ่าย", "เช้า", "บ่าย", ""],
    ];

    // Data Rows
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
        index + 1, // A
        item.id, // B
        dateDisplay, // C
        item.name, // D
        item.building, // E
        floorValue, // F
        item.location, // G
        translateStatus(item.status), // H: ใช้ฟังก์ชันที่แก้แล้วด้านล่าง
        item.timeMorning, // I
        item.timeAfternoon, // J
        workMorning, // K
        workAfternoon, // L
        item.remark, // M
      ]);
    });

    // 6. สร้าง Worksheet
    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // กำหนด Merge Cells
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } }, // Title
      { s: { r: 1, c: 0 }, e: { r: 1, c: 12 } }, // Date
      { s: { r: 2, c: 0 }, e: { r: 3, c: 0 } }, // ลำดับ
      { s: { r: 2, c: 1 }, e: { r: 3, c: 1 } }, // รหัส
      { s: { r: 2, c: 2 }, e: { r: 3, c: 2 } }, // วันที่
      { s: { r: 2, c: 3 }, e: { r: 3, c: 3 } }, // ชื่อ
      { s: { r: 2, c: 4 }, e: { r: 3, c: 4 } }, // อาคาร
      { s: { r: 2, c: 5 }, e: { r: 3, c: 5 } }, // ชั้น
      { s: { r: 2, c: 6 }, e: { r: 3, c: 6 } }, // จุดตรวจ
      { s: { r: 2, c: 7 }, e: { r: 3, c: 7 } }, // สถานะ
      { s: { r: 2, c: 8 }, e: { r: 2, c: 9 } }, // Time
      { s: { r: 2, c: 10 }, e: { r: 2, c: 11 } }, // Check
      { s: { r: 2, c: 12 }, e: { r: 3, c: 12 } }, // หมายเหตุ
    ];

    // ใส่ Style (ถ้าโหลด library ได้)
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

    // กำหนดความกว้าง
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

// 🔥🔥🔥 จุดที่แก้ไขสำคัญ: แปลงสถานะให้ตรงกับความเป็นจริง 🔥🔥🔥
const translateStatus = (status) => {
  const map = {
    pass: "เรียบร้อย", // แม่บ้านกดผ่านเอง
    approved: "ตรวจแล้ว", // หัวหน้ากดอนุมัติ
    fixed: "แก้ไขแล้ว", // แก้งานแล้ว
    fail: "พบปัญหา", // เจอจุดบกพร่อง
    rejected: "ปฏิเสธ", // หัวหน้าตีกลับ
    waiting: "รอตรวจ", // ✅ อันนี้แหละที่ต้องมี!
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
