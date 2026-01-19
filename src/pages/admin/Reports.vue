<script setup>
import { ref, onMounted, computed } from "vue";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import { useRouter } from "vue-router";

// Import Components
import ReportHeader from "@/components/admin/report/ReportHeader.vue";
import ReportStats from "@/components/admin/report/ReportStats.vue";
import ReportTable from "@/components/admin/report/ReportTable.vue";

const router = useRouter();

// State
const loading = ref(true);
const searchQuery = ref("");
const logs = ref([]);
const stats = ref({ total: 0, pass: 0, fail: 0, staff: 0 });
const currentRange = ref({ type: "today", start: "", end: "" });

// Helpers
const getDateString = (date) => {
  const y = date.getFullYear(),
    m = String(date.getMonth() + 1).padStart(2, "0"),
    d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// ✅ 1. เพิ่มฟังก์ชันแปลงสถานะ
const getStatusLabel = (status) => {
  const map = {
    pass: "เรียบร้อย",
    approved: "อนุมัติแล้ว",
    fixed: "แก้ไขแล้ว",
    fail: "พบปัญหา",
    rejected: "ปฏิเสธ",
    waiting: "รอตรวจ",
    in_progress: "กำลังทำ",
  };
  return map[status] || status;
};

// ✅ 2. ฟังก์ชันแปลงวันที่ไทย (ใช้ตอน Export)
const formatThaiDate = (dateString) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    calendar: "buddhist",
  });
};

// Logic ดึงข้อมูล
const getQueryDates = (rangeObj) => {
  const { type, start, end } = rangeObj;
  const today = new Date();

  if (type === "today") return { start: getDateString(today), end: getDateString(today) };
  if (type === "yesterday") {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return { start: getDateString(d), end: getDateString(d) };
  }
  if (type === "week") {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return { start: getDateString(d), end: getDateString(today) };
  }
  if (type === "month") {
    const d = new Date();
    d.setDate(1);
    return { start: getDateString(d), end: getDateString(today) };
  }
  return { start, end };
};

const fetchData = async (rangeObj = currentRange.value) => {
  loading.value = true;
  currentRange.value = rangeObj;

  try {
    const { start, end } = getQueryDates(rangeObj);

    // ✅ แก้ไข Query:
    // 1. ระบุ FK employees ให้ชัดเจน (!check_sessions_employees_id_fkey) กัน Error
    // 2. เพิ่ม time_slots เข้ามาด้วย เพื่อให้ดูรอบเวลาได้
    let query = supabase
      .from("check_sessions")
      .select(
        `
        *, 
        employees:employees!check_sessions_employees_id_fkey (
          employees_firstname, 
          employees_lastname, 
          employees_photo, 
          role 
        ), 
        locations (
          locations_name, 
          locations_building, 
          locations_floor
        ),
        restroom_types (restroom_types_name),
        time_slots (
          time_slots_name,
          time_slots_start,
          time_slots_end
        )
      `
      )
      .order("created_at", { ascending: false });

    if (rangeObj.type === "today" || rangeObj.type === "yesterday") {
      query = query.eq("check_sessions_date", start);
    } else {
      const endDate = end || start;
      query = query.gte("check_sessions_date", start).lte("check_sessions_date", endDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    logs.value = data;
    stats.value = {
      total: data.length,
      pass: data.filter((i) =>
        ["pass", "approved", "fixed"].includes(i.check_sessions_status)
      ).length,
      fail: data.filter((i) => ["fail", "rejected"].includes(i.check_sessions_status))
        .length,
      staff: new Set(data.map((i) => i.employees_id)).size,
    };
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const filteredLogs = computed(() => {
  if (!searchQuery.value) return logs.value;
  const q = searchQuery.value.toLowerCase();
  return logs.value.filter(
    (item) =>
      item.employees?.employees_firstname.toLowerCase().includes(q) ||
      item.locations?.locations_name.toLowerCase().includes(q)
  );
});

// ✅ ฟังก์ชัน Export (ปรับปรุงให้โชว์รอบเวลา)
const handleExport = () => {
  if (!logs.value || logs.value.length === 0) {
    return Swal.fire(
      "ไม่มีข้อมูล",
      "กรุณาเลือกช่วงเวลาที่มีข้อมูลก่อน Export",
      "warning"
    );
  }

  const rows = logs.value.map((item) => {
    // จัดรูปแบบรอบเวลา
    const slotInfo = item.time_slots
      ? `${item.time_slots.time_slots_name} (${item.time_slots.time_slots_start.slice(
          0,
          5
        )}-${item.time_slots.time_slots_end.slice(0, 5)})`
      : "-";

    return {
      รหัสงาน: `#${item.check_sessions_id}`,
      วันที่และเวลา: formatThaiDate(item.created_at),
      รอบเวลา: slotInfo, // ✅ เพิ่มคอลัมน์นี้
      ชื่อพนักงาน:
        `${item.employees?.employees_firstname || ""} ${
          item.employees?.employees_lastname || ""
        }`.trim() || "ไม่ระบุ",
      ตำแหน่ง: item.employees?.role || "-",
      อาคาร: item.locations?.locations_building || "-",
      ชั้น: item.locations?.locations_floor || "-",
      จุดตรวจสอบ: item.locations?.locations_name || "-",
      สถานะ: getStatusLabel(item.check_sessions_status),
      หมายเหตุ: item.check_sessions_note || "-",
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 10 }, // รหัสงาน
    { wch: 22 }, // วันที่
    { wch: 18 }, // รอบเวลา (เพิ่มความกว้าง)
    { wch: 25 }, // ชื่อ
    { wch: 10 }, // ตำแหน่ง
    { wch: 10 }, // อาคาร
    { wch: 8 }, // ชั้น
    { wch: 25 }, // จุดตรวจ
    { wch: 15 }, // สถานะ
    { wch: 30 }, // หมายเหตุ
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Reports");

  const fileName = `Maid_Report_${currentRange.value.start}_to_${
    currentRange.value.end || currentRange.value.start
  }.xlsx`;
  XLSX.writeFile(workbook, fileName);

  Swal.fire({
    icon: "success",
    title: "ดาวน์โหลดสำเร็จ!",
    text: `ไฟล์ ${fileName} ถูกบันทึกแล้ว`,
    timer: 2000,
    showConfirmButton: false,
  });
};

onMounted(() => fetchData());
</script>

<template>
  <div class="space-y-6">
    <ReportHeader :loading="loading" @update:range="fetchData" @export="handleExport" />

    <ReportStats :stats="stats" />

    <ReportTable
      :logs="filteredLogs"
      :loading="loading"
      @update:search="(val) => (searchQuery = val)"
      @view="(id) => router.push(`/admin/check/${id}`)"
    />
  </div>
</template>
