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
        text: "ระบบอนุญาตให้ดาวน์โหลดข้อมูลได้สูงสุดครั้งละ 4 เดือนเท่านั้นครับ",
        confirmButtonColor: "#f59e0b",
        confirmButtonText: "เข้าใจแล้ว",
      });
      return;
    }

    isExporting.value = true;

    // ✅ 2. Dynamic Import (ใช้ xlsx-js-style ถ้ามี ถ้าไม่มีใช้ xlsx)
    let XLSX;
    try {
      XLSX = await import("xlsx-js-style");
    } catch (e) {
      console.warn("xlsx-js-style not found, falling back to xlsx");
      XLSX = await import("xlsx");
    }

    const startDateTh = startDateObj.toLocaleDateString("th-TH", { dateStyle: "long" });
    const endDateTh = endDateObj.toLocaleDateString("th-TH", { dateStyle: "long" });

    // 3. ดึงข้อมูลจาก Supabase (โครงสร้างเดิม ห้ามแก้)
    const { data: rawLogs, error } = await supabase
      .from("check_sessions")
      .select(
        `*, employees (employees_firstname, employees_lastname), locations (locations_name, locations_building, locations_floor)`
      )
      .gte("created_at", start)
      .lte("created_at", end)
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!rawLogs || rawLogs.length === 0) {
      Swal.fire("ไม่พบข้อมูล", "ไม่มีข้อมูลในช่วงเวลาที่เลือก", "info");
      return;
    }

    // 4. Process Data: เตรียมข้อมูล (โครงสร้างเดิม)
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
      const isMorning = logTimeObj.getHours() < 12;

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

    // 5. ✅ สร้างโครงสร้างข้อมูลใหม่สำหรับ Excel (Complex Header)
    // Row 1-2: Title
    const ws_data = [
      [`รายงานสรุปการทำความสะอาด (Maid Report)`],
      [`ช่วงวันที่: ${startDateTh} ถึง ${endDateTh}`],
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

      // แปลงช่วงการทำงาน (count) เป็นเครื่องหมายถูก หรือตัวเลข
      const workMorning = item.morningCount > 0 ? "✓" : "-"; // หรือใช้ item.morningCount
      const workAfternoon = item.afternoonCount > 0 ? "✓" : "-";

      ws_data.push([
        index + 1, // A: ลำดับ
        item.id, // B: รหัสงาน
        dateDisplay, // C: วันที่
        item.name, // D: ชื่อพนักงาน
        item.building, // E: อาคาร
        floorValue, // F: ชั้น
        item.location, // G: จุดตรวจ
        translateStatus(item.status), // H: สถานะ
        item.timeMorning, // I: เวลาเช้า
        item.timeAfternoon, // J: เวลาบ่าย
        workMorning, // K: รอบเช้า (check)
        workAfternoon, // L: รอบบ่าย (check)
        item.remark, // M: หมายเหตุ
      ]);
    });

    // 6. สร้าง Worksheet
    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // ✅ กำหนด Merge Cells (ตามภาพ image_43f34c.png)
    ws["!merges"] = [
      // Title Row 1 (A1:M1)
      { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } },
      // Date Row 2 (A2:M2)
      { s: { r: 1, c: 0 }, e: { r: 1, c: 12 } },

      // Main Headers Vertical Merge (A3:A4 - H3:H4)
      { s: { r: 2, c: 0 }, e: { r: 3, c: 0 } }, // ลำดับ
      { s: { r: 2, c: 1 }, e: { r: 3, c: 1 } }, // รหัสงาน
      { s: { r: 2, c: 2 }, e: { r: 3, c: 2 } }, // วันที่
      { s: { r: 2, c: 3 }, e: { r: 3, c: 3 } }, // ชื่อพนักงาน
      { s: { r: 2, c: 4 }, e: { r: 3, c: 4 } }, // อาคาร
      { s: { r: 2, c: 5 }, e: { r: 3, c: 5 } }, // ชั้น
      { s: { r: 2, c: 6 }, e: { r: 3, c: 6 } }, // จุดตรวจ
      { s: { r: 2, c: 7 }, e: { r: 3, c: 7 } }, // สถานะ

      // Group Headers Horizontal Merge
      { s: { r: 2, c: 8 }, e: { r: 2, c: 9 } }, // ประทับเวลา (I3:J3)
      { s: { r: 2, c: 10 }, e: { r: 2, c: 11 } }, // ช่วงการทำงาน (K3:L3)

      // Remark Vertical Merge (M3:M4)
      { s: { r: 2, c: 12 }, e: { r: 3, c: 12 } }, // หมายเหตุ
    ];

    // ✅ ใส่ Style (ถ้าใช้ xlsx-js-style)
    // วนลูปเพื่อใส่เส้นขอบและจัดกึ่งกลาง
    if (ws["!ref"]) {
      const range = XLSX.utils.decode_range(ws["!ref"]);
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cell_address]) continue;

          // Default Style
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

          // Header Style (Row 1-4)
          if (R < 4) {
            ws[cell_address].s.font.bold = true;
            ws[cell_address].s.fill = { fgColor: { rgb: "EFEFEF" } };
            if (R === 0) ws[cell_address].s.font.sz = 18; // Title ใหญ่หน่อย
          }
        }
      }
    }

    // กำหนดความกว้างคอลัมน์
    ws["!cols"] = [
      { wch: 6 }, // A: ลำดับ
      { wch: 10 }, // B: รหัส
      { wch: 12 }, // C: วันที่
      { wch: 20 }, // D: พนักงาน
      { wch: 8 }, // E: อาคาร
      { wch: 6 }, // F: ชั้น
      { wch: 20 }, // G: จุดตรวจ
      { wch: 15 }, // H: สถานะ
      { wch: 10 }, // I: เวลาเช้า
      { wch: 10 }, // J: เวลาบ่าย
      { wch: 8 }, // K: รอบเช้า
      { wch: 8 }, // L: รอบบ่าย
      { wch: 25 }, // M: หมายเหตุ
    ];

    // 7. เพิ่มส่วนนี้เพื่อกำหนดความสูงของแถว (Row Height)
    ws["!rows"] = [
      { hpt: 35 }, // แถวที่ 1 (Title)
      { hpt: 30 }, // แถวที่ 2 (Date Range)
      { hpt: 25 }, // แถวที่ 3 (Header หลัก)
      // แถวอื่นๆ ที่เหลือจะใช้ความสูง default ของ Excel อัตโนมัติ
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Maid Report");

    // 7. Download File
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
    approved: "เรียบร้อย",
    fail: "พบปัญหา",
    rejected: "พบปัญหา",
    fixed: "แก้ไขแล้ว",
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
