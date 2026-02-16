<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { supabase } from "@/lib/supabase";
import { useSwal } from "@/composables/useSwal";
import { useRouter } from "vue-router";
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

const fetchData = async (rangeObj = currentRange.value) => {
  loading.value = true;
  currentRange.value = rangeObj;

  try {
    const { start, end } = getQueryDates(rangeObj);
    const endDateStr = end || start;

    let searchFilter = null;

    if (searchQuery.value && searchQuery.value.trim() !== "") {
        const term = searchQuery.value.trim();
        const orConditions = [];

        if (!isNaN(term)) {
             orConditions.push(`check_sessions_id.eq.${term}`);
        }

        const { data: locData } = await supabase
            .from('locations')
            .select('locations_id')
            .or(`locations_name.ilike.%${term}%,locations_building.ilike.%${term}%`)
            .limit(50);
        if (locData?.length) {
            orConditions.push(`locations_id.in.(${locData.map(l => l.locations_id).join(',')})`);
        }

        const { data: empData } = await supabase
            .from('employees')
            .select('employees_id')
            .or(`employees_firstname.ilike.%${term}%,employees_lastname.ilike.%${term}%`)
            .limit(50);
        if (empData?.length) {
            orConditions.push(`employees_id.in.(${empData.map(e => e.employees_id).join(',')})`);
        }

        if (orConditions.length > 0) {
            searchFilter = orConditions.join(',');
        } else {
            searchFilter = `check_sessions_id.eq.-1`;
        }
    }

    const from = (currentPage.value - 1) * itemsPerPage.value;
    const to = from + itemsPerPage.value - 1;

    let mainQuery = supabase
      .from("check_sessions")
      .select(`*, employees:employees!check_sessions_employees_id_fkey(employees_firstname, employees_lastname, employees_photo, role), locations!inner(locations_name, locations_building, locations_floor), restroom_types(restroom_types_name), time_slots(time_slots_name, time_slots_start, time_slots_end)`, { count: "exact" })
      .gte("check_sessions_date", start).lte("check_sessions_date", endDateStr)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (searchFilter) mainQuery = mainQuery.or(searchFilter);

    let passQuery = supabase
      .from("check_sessions")
      .select('check_sessions_id', { count: 'exact', head: true })
      .gte("check_sessions_date", start).lte("check_sessions_date", endDateStr)
      .in('check_sessions_status', ['pass', 'fixed', 'approved']);
    if (searchFilter) passQuery = passQuery.or(searchFilter);

    let failQuery = supabase
      .from("check_sessions")
      .select('check_sessions_id', { count: 'exact', head: true })
      .gte("check_sessions_date", start).lte("check_sessions_date", endDateStr)
      .in('check_sessions_status', ['fail', 'rejected']);
    if (searchFilter) failQuery = failQuery.or(searchFilter);

    let staffQuery = supabase
        .from("check_sessions")
        .select('employees_id')
        .gte("check_sessions_date", start).lte("check_sessions_date", endDateStr);
    if (searchFilter) staffQuery = staffQuery.or(searchFilter);

    const [mainRes, passRes, failRes, staffRes] = await Promise.all([
        mainQuery, passQuery, failQuery, staffQuery
    ]);

    if (mainRes.error) throw mainRes.error;

    logs.value = mainRes.data;
    totalItems.value = mainRes.count || 0;

    const uniqueStaffCount = new Set(staffRes.data?.map(s => s.employees_id)).size || 0;

    stats.value = {
      total: mainRes.count || 0,
      pass: passRes.count || 0,
      fail: failRes.count || 0,
      staff: uniqueStaffCount,
    };

  } catch (err) {
    console.error("Fetch Error:", err);
  } finally {
    loading.value = false;
  }
};

// --- 🔥 Handle Export (Logic ที่เพิ่มกลับมา) ---
const handleExport = async () => {
  const { start, end } = getQueryDates(currentRange.value);
  const endDateStr = end || start;

  const result = await Swal.fire({
    title: "ดาวน์โหลดรายงาน?",
    text: `ต้องการดาวน์โหลดข้อมูลวันที่ ${start} ถึง ${endDateStr} เป็น Excel หรือไม่?`,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "ดาวน์โหลด",
    confirmButtonColor: "#10b981",
  });

  if (!result.isConfirmed) return;

  Swal.fire({
    title: "กำลังสร้างไฟล์...",
    html: "ระบบกำลังประมวลผลที่ Server กรุณารอสักครู่",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  try {
    const { data: { session } } = await supabase.auth.getSession();

    // เรียก Edge Function
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-work-performance`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        start: start,
        end: endDateStr,
        search: searchQuery.value
      })
    });

    if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Export failed');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    // ตั้งชื่อไฟล์เป็น .xlsx
    link.setAttribute('download', `Work_Report_${start}_to_${endDateStr}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    Swal.close();
    Swal.fire("สำเร็จ", "ดาวน์โหลดรายงานเรียบร้อยแล้ว", "success");

  } catch (err) {
    console.error("Export Error:", err);
    Swal.fire("Error", "เกิดข้อผิดพลาดในการดาวน์โหลด: " + err.message, "error");
  }
};

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

let searchTimeout;
watch(searchQuery, (newVal) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        currentPage.value = 1;
        fetchData();
    }, 500);
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
                แสดง {{ logs.length }} รายการ (จากทั้งหมด {{ totalItems }})
            </div>

            <div class="flex items-center gap-2">
              <div class="text-sm text-gray-500 dark:text-slate-400"> หน้า {{ currentPage }} / {{ totalPages }}</div>
                <button
                    @click="prevPage"
                    :disabled="currentPage === 1 || loading"
                    class="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 dark:border-slate-600 transition-colors"
                >
                    <ChevronLeft class="w-4 h-4 text-gray-600 dark:text-slate-300" />
                </button>
                <button
                    @click="nextPage"
                    :disabled="currentPage === totalPages || loading"
                    class="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 dark:border-slate-600 transition-colors"
                >
                    <ChevronRight class="w-4 h-4 text-gray-600 dark:text-slate-300" />
                </button>
            </div>
        </div>
    </div>
  </div>
</template>
