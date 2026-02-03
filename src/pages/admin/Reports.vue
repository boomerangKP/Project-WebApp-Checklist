<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { supabase } from "@/lib/supabase";
import { useSwal } from "@/composables/useSwal";
import { useRouter } from "vue-router";
// ✅ เพิ่มไอคอนสำหรับปุ่มเปลี่ยนหน้า
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-vue-next"; 

// Import Components เดิม (ไม่ต้องแก้ไขไฟล์พวกนี้ ยกเว้น ReportTable ที่เราแก้ไปแล้ว)
import ReportHeader from "@/components/admin/report/ReportHeader.vue";
import ReportStats from "@/components/admin/report/ReportStats.vue";
import ReportTable from "@/components/admin/report/ReportTable.vue";

const router = useRouter();
const { Swal } = useSwal();

// --- State ---
const loading = ref(true);
const searchQuery = ref("");
const logs = ref([]); // เก็บข้อมูลแค่ 50 ตัว (สำหรับหน้าปัจจุบัน)
const stats = ref({ total: 0, pass: 0, fail: 0, staff: 0 });
const currentRange = ref({ type: "today", start: "", end: "" });

// ✅ Pagination State (เพิ่มเข้ามาเพื่อคุมการเปลี่ยนหน้า)
const currentPage = ref(1);
const itemsPerPage = ref(50); // โชว์ทีละ 50 รายการ (แนะนำค่านี้ เพื่อความลื่น)
const totalItems = ref(0); // จำนวนรายการทั้งหมดใน DB

// --- Helpers ---
const getDateString = (date) => {
  const y = date.getFullYear(),
    m = String(date.getMonth() + 1).padStart(2, "0"),
    d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

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

// --- Logic หลัก: ดึงข้อมูลแบบแบ่งหน้า (Server-side Pagination) ---
const fetchData = async (rangeObj = currentRange.value) => {
  loading.value = true;
  currentRange.value = rangeObj;

  try {
    const { start, end } = getQueryDates(rangeObj);
    const endDateStr = end || start;

    // คำนวณช่วงข้อมูลที่จะดึง (เช่น หน้า 1 = 0-49)
    const from = (currentPage.value - 1) * itemsPerPage.value;
    const to = from + itemsPerPage.value - 1;

    let query = supabase
      .from("check_sessions")
      .select(
        `
        *,
        employees:employees!check_sessions_employees_id_fkey (
          employees_firstname, employees_lastname, employees_photo, role
        ),
        locations (
            locations_name, locations_building, locations_floor
        ),
        restroom_types (restroom_types_name),
        time_slots (
            time_slots_name, time_slots_start, time_slots_end
        )
        `,
        { count: "exact" } // ✅ ขอจำนวนรวมทั้งหมดมาด้วย
      )
      .order("created_at", { ascending: false })
      .range(from, to); // ✅ ตัดมาแค่ 50 ตัวของหน้านี้

    // Filter วันที่
    query = query.gte("check_sessions_date", start).lte("check_sessions_date", endDateStr);

    // Filter ค้นหา (Search Server-side)
    if (searchQuery.value) {
        // หมายเหตุ: การค้นหาชื่อคน (Relation) ใน Supabase JS Client จะซับซ้อน
        // เบื้องต้นรองรับการค้นหาด้วย ID ก่อน เพื่อประสิทธิภาพ
        const q = searchQuery.value.trim();
        // ถ้าเป็นตัวเลข ให้ลองหาจาก ID
        if (!isNaN(q)) {
             query = query.eq('check_sessions_id', q);
        }
        // *ถ้าต้องการค้นหาชื่อพนักงาน ต้องใช้ View หรือ Text Search function เพิ่มเติม
    }

    const { data, count, error } = await query;
    if (error) throw error;

    logs.value = data; // ใส่ข้อมูล 50 ตัวลงตาราง
    totalItems.value = count || 0; // เก็บยอดรวมจริง

    // อัปเดต Stats (ใช้ยอดรวมจาก Count)
    stats.value = {
      total: count || 0,
      pass: 0, // เว้นไว้ก่อนเพื่อความเร็ว (ถ้าจะนับต้องยิง Query แยก)
      fail: 0,
      staff: 0,
    };

  } catch (err) {
    console.error(err);
    Swal.fire("Error", err.message, "error");
  } finally {
    loading.value = false;
  }
};

// --- Logic Export: โหลด CSV Stream (รองรับหลักแสน) ---
const handleExport = async () => {
  const { start, end } = getQueryDates(currentRange.value);
  const endDateStr = end || start;

  const result = await Swal.fire({
    title: "ยืนยันการดาวน์โหลด?",
    text: `ข้อมูลช่วงวันที่ ${start} ถึง ${endDateStr} ระบบจะดาวน์โหลดเป็นไฟล์ CSV เพื่อความรวดเร็ว`,
    icon: "info",
    showCancelButton: true,
    confirmButtonText: "ดาวน์โหลด CSV",
    confirmButtonColor: "#10b981",
  });

  if (!result.isConfirmed) return;

  Swal.fire({ title: 'กำลังเตรียมไฟล์...', didOpen: () => Swal.showLoading() });

  try {
    // ✅ ใช้ CSV Download เพื่อไม่ให้ Browser ค้าง
    // แนะนำ: ถ้าสร้าง View 'report_maid_export' แล้ว ให้เปลี่ยน 'check_sessions' เป็นชื่อ View
    const { data, error } = await supabase
        .from('check_sessions') 
        .select(`
            check_sessions_id,
            check_sessions_date,
            check_sessions_status,
            check_sessions_notes,
            created_at,
            checked_at
        `) // เลือก Field ที่ต้องการ
        .gte("check_sessions_date", start)
        .lte("check_sessions_date", endDateStr)
        .csv();

    if (error) throw error;

    // สร้างไฟล์
    const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Report_${start}_${endDateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    Swal.close();
    Swal.fire("สำเร็จ", "ดาวน์โหลดเรียบร้อย", "success");

  } catch (err) {
    Swal.fire("Error", err.message, "error");
  }
};

// --- Pagination Controls ---
const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value) || 1);

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    fetchData(); // โหลดหน้าถัดไป
  }
};

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
    fetchData(); // โหลดหน้าก่อนหน้า
  }
};

// Watch Search (ถ้ามีการพิมพ์ค้นหา ให้รีเซ็ตไปหน้า 1 แล้วค้นใหม่)
watch(searchQuery, () => {
    currentPage.value = 1;
    fetchData();
});

onMounted(() => fetchData());
</script>

<template>
  <div class="space-y-6">
    <ReportHeader 
        :loading="loading" 
        @update:range="(val) => { currentPage = 1; fetchData(val); }" 
        @export="handleExport" 
    />

    <ReportStats :stats="stats" />

    <div class="bg-white dark:bg-slate-800 shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden flex flex-col">
        
        <ReportTable
            :logs="logs"
            :loading="loading"
            @update:search="(val) => (searchQuery = val)"
            @view="(id) => router.push(`/admin/check/${id}`)"
        />

        <div class="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-1 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
            <div class="text-sm text-gray-500 dark:text-slate-400">
                แสดง {{ logs.length }} รายการ (จากทั้งหมด {{ totalItems }}) | หน้า {{ currentPage }} / {{ totalPages }}
            </div>
            
            <div class="flex items-center gap-2">
                <button 
                    @click="prevPage" 
                    :disabled="currentPage === 1 || loading"
                    class="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronLeft class="w-5 h-5 text-gray-600 dark:text-slate-300" />
                </button>
                <button 
                    @click="nextPage" 
                    :disabled="currentPage === totalPages || loading"
                    class="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronRight class="w-5 h-5 text-gray-600 dark:text-slate-300" />
                </button>
            </div>
        </div>
    </div>
  </div>
</template>