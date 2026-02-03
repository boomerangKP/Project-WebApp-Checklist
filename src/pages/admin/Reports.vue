<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { supabase } from "@/lib/supabase";
import { useSwal } from "@/composables/useSwal";
import { useRouter } from "vue-router";
import * as XLSX from "xlsx"; 
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-vue-next"; 

// Import Components เดิม
import ReportHeader from "@/components/admin/report/ReportHeader.vue";
import ReportStats from "@/components/admin/report/ReportStats.vue";
import ReportTable from "@/components/admin/report/ReportTable.vue";

const router = useRouter();
const { Swal } = useSwal();

// --- State ---
const loading = ref(true);
const searchQuery = ref("");
const logs = ref([]); 
const stats = ref({ total: 0, pass: 0, fail: 0, staff: 0 });
const currentRange = ref({ type: "today", start: "", end: "" });

// Pagination State
const currentPage = ref(1);
const itemsPerPage = ref(50);
const totalItems = ref(0);

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

const chunkArray = (array, size) => {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};

// --- Logic หลัก: ดึงข้อมูลหน้าเว็บ (Pagination) ---
const fetchData = async (rangeObj = currentRange.value) => {
  loading.value = true;
  currentRange.value = rangeObj;

  try {
    const { start, end } = getQueryDates(rangeObj);
    const endDateStr = end || start;

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
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    query = query.gte("check_sessions_date", start).lte("check_sessions_date", endDateStr);

    if (searchQuery.value) {
        const q = searchQuery.value.trim();
        if (!isNaN(q)) {
             query = query.eq('check_sessions_id', q);
        }
    }

    const { data, count, error } = await query;
    if (error) throw error;

    logs.value = data;
    totalItems.value = count || 0;

    stats.value = {
      total: count || 0,
      pass: 0, 
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

// --- 🔥 Logic Export: เร็วแรง + แก้ไขปัญหาค้าง ---
const handleExport = async () => {
  const { start, end } = getQueryDates(currentRange.value);
  const endDateStr = end || start;

  const result = await Swal.fire({
    title: "ดาวน์โหลดรายงาน?",
    text: `ต้องการดาวน์โหลดข้อมูลวันที่ ${start} ถึง ${endDateStr} เป็น Excel หรือไม่?`,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "ดาวน์โหลด Excel",
    confirmButtonColor: "#10b981",
  });

  if (!result.isConfirmed) return;

  // Show Loading Progress
  Swal.fire({
    title: "กำลังเตรียมไฟล์...",
    html: "เริ่มทำการดึงข้อมูล...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  try {
    // 1. หาจำนวนทั้งหมดก่อน
    let countQuery = supabase
        .from('check_sessions')
        .select('check_sessions_id', { count: 'exact', head: true })
        .gte("check_sessions_date", start)
        .lte("check_sessions_date", endDateStr);

    if (searchQuery.value && !isNaN(searchQuery.value)) {
        countQuery = countQuery.eq('check_sessions_id', searchQuery.value);
    }

    const { count, error: countError } = await countQuery;
    if (countError) throw countError;
    if (!count) throw new Error("ไม่พบข้อมูลในช่วงเวลาที่เลือก");

    // 2. ตั้งค่า Batch (1000 แถว x 5 ยิงพร้อมกัน)
    const BATCH_SIZE = 1000;
    const CONCURRENCY_LIMIT = 5;
    const totalBatches = Math.ceil(count / BATCH_SIZE);
    const batchPromises = [];

    // 3. สร้าง Promise รอไว้
    for (let i = 0; i < totalBatches; i++) {
        const from = i * BATCH_SIZE;
        const to = from + BATCH_SIZE - 1;

        let query = supabase
            .from('check_sessions')
            .select(`
                check_sessions_date,
                check_sessions_time_start,
                check_sessions_status,
                check_sessions_notes,
                created_at,
                checked_at,
                checked_by,
                employees:employees!check_sessions_employees_id_fkey (
                    employees_firstname, employees_lastname, employees_code
                ),
                locations (
                    locations_name, locations_building, locations_floor
                )
            `)
            .gte("check_sessions_date", start)
            .lte("check_sessions_date", endDateStr)
            .range(from, to)
            .order("created_at", { ascending: false });

        if (searchQuery.value && !isNaN(searchQuery.value)) {
            query = query.eq('check_sessions_id', searchQuery.value);
        }

        batchPromises.push(query);
    }

    // 4. ยิง Request เป็นชุดๆ
    const requestChunks = chunkArray(batchPromises, CONCURRENCY_LIMIT);
    let allData = [];
    let processedCount = 0;

    for (const chunk of requestChunks) {
        const responses = await Promise.all(chunk);
        for (const res of responses) {
            if (res.error) throw res.error;
            if (res.data) {
                // ⚠️ แก้ไขจุดตาย: ใช้ push แทน concat เพื่อลดการกิน Memory
                allData.push(...res.data);
            }
        }
        
        processedCount += chunk.length * BATCH_SIZE;
        const progress = Math.min(Math.round((allData.length / count) * 100), 100);
        if (Swal.getHtmlContainer()) {
            Swal.getHtmlContainer().innerHTML = `กำลังดาวน์โหลด... ${progress}%<br/>(${allData.length.toLocaleString()} / ${count.toLocaleString()} รายการ)`;
        }
    }

    // แจ้งเตือนก่อนสร้างไฟล์ (ช่วงนี้ CPU จะทำงานหนัก)
    if (Swal.getHtmlContainer()) {
        Swal.getHtmlContainer().innerHTML = `กำลังสร้างไฟล์ Excel...<br/>(อาจใช้เวลาสักครู่ กรุณาอย่าปิดหน้าต่าง)`;
    }
    await new Promise(resolve => setTimeout(resolve, 500)); // พักให้ UI อัปเดต

    // 5. แปลงข้อมูลลง Excel
    const excelData = allData.map(item => ({
        "วันที่": item.check_sessions_date,
        "เวลา": item.check_sessions_time_start,
        "สถานที่": item.locations?.locations_name || '-',
        "อาคาร": item.locations?.locations_building || '-',
        "ชั้น": item.locations?.locations_floor || '-',
        "พนักงาน": item.employees ? `${item.employees.employees_firstname} ${item.employees.employees_lastname}` : '-',
        "สถานะ": item.check_sessions_status === 'approved' ? 'ผ่าน/ตรวจแล้ว' : 
                 item.check_sessions_status === 'rejected' ? 'ไม่ผ่าน/แก้ไข' : 'รอตรวจสอบ',
        "หมายเหตุ": item.check_sessions_notes || '-',
        "เวลาที่ส่งงาน": new Date(item.created_at).toLocaleTimeString('th-TH'),
        "เวลาที่ตรวจ": item.checked_at ? new Date(item.checked_at).toLocaleTimeString('th-TH') : '-'
    }));

    // 6. สร้างไฟล์
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Work Report");

    worksheet["!cols"] = [
        { wch: 12 }, { wch: 10 }, { wch: 25 }, { wch: 10 }, { wch: 8 }, 
        { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 }
    ];

    XLSX.writeFile(workbook, `Maid_Report_${start}_to_${endDateStr}.xlsx`);

    Swal.fire({
        icon: "success",
        title: "ดาวน์โหลดสำเร็จ",
        text: `ข้อมูลทั้งหมด ${allData.length.toLocaleString()} รายการ`,
        timer: 2000,
        showConfirmButton: false
    });

  } catch (err) {
    console.error("Export Error:", err);
    Swal.fire("Error", "เกิดข้อผิดพลาดในการดาวน์โหลด: " + err.message, "error");
  }
};

// --- Pagination Controls ---
const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value) || 1);

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    fetchData(); 
  }
};

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
    fetchData(); 
  }
};

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