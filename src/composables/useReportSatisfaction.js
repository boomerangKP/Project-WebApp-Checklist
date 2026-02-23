import { ref, watch, onMounted, computed } from "vue";
import { supabase } from "@/lib/supabase";
import { useSwal } from "@/composables/useSwal";

export function useReportSatisfaction() {
  const { Swal  } = useSwal();

  // --- State ---
  const loading = ref(false);
  const feedbacks = ref([]);
  const dateFilter = ref("today");
  const customStart = ref("");
  const customEnd = ref("");
  const topicsMap = ref({});

  // 🔥 NEW: เพิ่มตัวแปรมารับค่าจากหน้าจอ (Checkbox ตัวกรองพื้นที่)
  const selectedFloors = ref([]); 
  const selectedTypes = ref([]);
  
  // Pagination
  const currentPage = ref(1);
  const itemsPerPage = ref(50);
  const totalItems = ref(0);
  const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value) || 1);

  // Stats (🔥 เพิ่ม csatPercent สำหรับหน้า Report)
  const stats = ref({
    totalReviews: 0, averageRating: "0.0", csatPercent: 0, topTopic: "-", topScore: "0.0", lowTopic: "-", lowScore: "0.0",
  });
  const trendChartData = ref({ labels: [], datasets: [] });
  const topicChartData = ref({ labels: [], datasets: [] });

  // --- Helpers ---
  const getDateRange = (filter) => {
    const start = new Date();
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    if (filter === 'today') start.setHours(0, 0, 0, 0);
    else if (filter === 'week') {
      const day = start.getDay() || 7;
      if (day !== 1) start.setHours(-24 * (day - 1));
      start.setHours(0, 0, 0, 0);
    } else if (filter === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    } else if (filter === 'custom') {
      if (!customStart.value || !customEnd.value) return null;
      const s = new Date(customStart.value);
      const e = new Date(customEnd.value);
      s.setHours(0, 0, 0, 0);
      e.setHours(23, 59, 59, 999);
      return { start: s.toISOString(), end: e.toISOString() };
    }
    return { start: start.toISOString(), end: end.toISOString() };
  };

  const fetchTopics = async () => {
    const { data } = await supabase.from('feedback_topics').select('id, name').order('id');
    if (data) {
      topicsMap.value = data.reduce((acc, curr) => { acc[curr.id] = curr.name; return acc; }, {});
    }
  };

  // 🔥 Helper ใหม่: สำหรับจัดการเงื่อนไข Filter กรองพื้นที่ 🔥
  const applyLocationFilters = (queryBuilder) => {
    let q = queryBuilder;
    
    // 1. กรองตามชั้น (Floor)
    if (selectedFloors.value.length > 0) {
      q = q.in("locations.locations_floor", selectedFloors.value);
    }

    // 2. กรองตามประเภทห้องน้ำ (ค้นหาจากคำในชื่อสถานที่)
    if (selectedTypes.value.length > 0) {
      const orConditions = [];
      if (selectedTypes.value.includes('patient')) {
        orConditions.push('locations_name.ilike.%คนไข้%');
        orConditions.push('locations_name.ilike.%ผู้ป่วย%');
        orConditions.push('locations_name.ilike.%ward%');
      }
      if (selectedTypes.value.includes('staff')) {
        orConditions.push('locations_name.ilike.%เจ้าหน้าที่%');
        orConditions.push('locations_name.ilike.%staff%');
      }
      
      if (orConditions.length > 0) {
        // ใช้ referencedTable ระบุว่าให้ไปหาในตาราง locations แทน foreignTable
        q = q.or(orConditions.join(','), { referencedTable: 'locations' });
      }
    }
    return q;
  };

  // ✅ Fetch Table Data (สำหรับแสดงผลหน้าเว็บ)
  const fetchTableData = async () => {
    try {
        const range = getDateRange(dateFilter.value);
        if (dateFilter.value === 'custom' && !range) return;

        const from = (currentPage.value - 1) * itemsPerPage.value;
        const to = from + itemsPerPage.value - 1;

        // 🔥 เพิ่มการดึง restroom_types(restroom_types_name) สำหรับคอลัมน์ใหม่ในตาราง
        let query = supabase.from("feedbacks")
            .select(`*, locations!inner (locations_name, locations_building, locations_floor, restroom_types(restroom_types_name))`, { count: 'exact' })
            .order("created_at", { ascending: false })
            .range(from, to);

        if (range) query = query.gte("created_at", range.start).lte("created_at", range.end);

        // ใช้งานตัวกรองพื้นที่
        query = applyLocationFilters(query);

        const { data, count, error } = await query;
        if (error) throw error;
        feedbacks.value = data;
        totalItems.value = count || 0;
    } catch (err) { console.error("Fetch Table Error:", err); }
  };

  // ✅ Fetch Stats Data (สำหรับกราฟ)
  const fetchStatsData = async () => {
    try {
        const range = getDateRange(dateFilter.value);
        if (dateFilter.value === 'custom' && !range) return;
        
        let query = supabase.from("feedbacks")
            .select('rating, answers, created_at, locations!inner (locations_name, locations_building, locations_floor)');
            
        if (range) query = query.gte("created_at", range.start).lte("created_at", range.end);
        
        // ใช้งานตัวกรองพื้นที่
        query = applyLocationFilters(query);

        const { data } = await query;
        if (data) {
            calculateStats(data);
            generateCharts(data);
        }
    } catch (err) { console.error("Fetch Stats Error:", err); }
  };

  const fetchData = async () => {
    loading.value = true;
    await Promise.all([fetchTableData(), fetchStatsData()]);
    loading.value = false;
  };

  const calculateStats = (data) => {
    if (!data.length) {
      stats.value = { 
        totalReviews: 0, averageRating: "0.0", csatPercent: 0, topTopic: "-", topScore: "0.0", lowTopic: "-", lowScore: "0.0" 
      };
      return;
    }
    
    let sumRating = 0;
    let satisfiedCount = 0; // 🔥 นับคนให้ 4-5 ดาว
    const topicScores = {};
    
    data.forEach((item) => {
      const rating = Number(item.rating || 0);
      sumRating += rating;

      // 🔥 คำนวณ CSAT: ใครให้คะแนน 4 ขึ้นไป ถือว่าพอใจ
      if (rating >= 4) {
        satisfiedCount += 1;
      }

      if (item.answers) {
        Object.entries(item.answers).forEach(([key, val]) => {
          const score = Number(val.rating || val);
          if (score > 0) {
            if (!topicScores[key]) topicScores[key] = { sum: 0, count: 0 };
            topicScores[key].sum += score;
            topicScores[key].count += 1;
          }
        });
      }
    });

    const avg = (sumRating / data.length).toFixed(1);
    const csat = Math.round((satisfiedCount / data.length) * 100); // 🔥 % CSAT
    
    let max = -1; let min = 6; let topName = "-"; let lowName = "-";
    for (const [id, obj] of Object.entries(topicScores)) {
      const topicAvg = obj.sum / obj.count;
      const name = topicsMap.value[id] || `หัวข้อ ${id}`;
      if (topicAvg > max) { max = topicAvg; topName = name; }
      if (topicAvg < min) { min = topicAvg; lowName = name; }
    }

    stats.value = {
      totalReviews: data.length,
      averageRating: avg,
      csatPercent: csat, // 🔥 ส่งค่า CSAT ออกไปให้ UI
      topTopic: max > -1 ? topName : "-",
      topScore: max > -1 ? max.toFixed(1) : "0.0",
      lowTopic: min < 6 ? lowName : "-",
      lowScore: min < 6 ? min.toFixed(1) : "0.0",
    };
  };

  const generateCharts = (data) => {
    const dateMap = {};
    data.forEach(item => {
      const date = new Date(item.created_at).toLocaleDateString("th-TH", { day: '2-digit', month: 'short' });
      if (!dateMap[date]) dateMap[date] = { sum: 0, count: 0 };
      dateMap[date].sum += Number(item.rating);
      dateMap[date].count += 1;
    });
    
    const labels = Object.keys(dateMap);
    const values = labels.map(date => (dateMap[date].sum / dateMap[date].count).toFixed(2));
    
    trendChartData.value = {
      labels,
      datasets: [{
        label: 'คะแนนเฉลี่ย',
        data: values,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.4,
        fill: true
      }]
    };

    const topicScores = {};
    data.forEach(item => {
      if (item.answers) {
        Object.entries(item.answers).forEach(([key, val]) => {
          const score = Number(val.rating || val);
          if (score > 0) {
            if (!topicScores[key]) topicScores[key] = { sum: 0, count: 0 };
            topicScores[key].sum += score;
            topicScores[key].count += 1;
          }
        });
      }
    });

    const topicLabels = []; const topicValues = [];
    Object.keys(topicsMap.value).forEach(id => {
       if (topicScores[id]) {
         topicLabels.push(topicsMap.value[id]);
         topicValues.push((topicScores[id].sum / topicScores[id].count).toFixed(2));
       }
    });

    topicChartData.value = {
      labels: topicLabels,
      datasets: [{ label: 'คะแนนเฉลี่ย', data: topicValues, backgroundColor: '#10b981', borderRadius: 6 }]
    };
  };

  // 🔥🔥🔥 ฟังก์ชัน Export ตัวใหม่ (สำคัญที่สุด!) 🔥🔥🔥
  const exportToExcel = async (optionalDates = null) => {
    try {
      let range;
      if (optionalDates && optionalDates.startDate) {
          range = { start: optionalDates.startDate, end: optionalDates.endDate };
      } else {
          range = getDateRange(dateFilter.value);
      }

      if (!range) {
          Swal.fire("ข้อผิดพลาด", "กรุณาเลือกช่วงเวลาให้ถูกต้อง", "warning");
          return;
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      
      // ✅ เรียก Edge Function (Server เป็นคนสร้างไฟล์ เราแค่นั่งรอรับ)
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-satisfaction`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startDate: range.start,
          endDate: range.end
        })
      });

      if (!response.ok) {
        const errorJson = await response.json();
        throw new Error(errorJson.error || 'Export failed from server');
      }

      // --- ✨ ส่วนจัดการชื่อไฟล์ภาษาไทย ✨ ---
    
      // ฟังก์ชันแปลงวันที่เป็นรูปแบบ: 01-มกราคม-2567
      const formatDateThaiFull = (dateStr) => {
        const d = new Date(dateStr);
        const day = d.getDate().toString().padStart(2, '0');
        const month = d.toLocaleDateString("th-TH", { month: 'long' });
        const year = d.toLocaleDateString("th-TH", { year: 'numeric' });
        return `${day}-${month}-${year}`;
      };

      const fileName = `รายงานความพึงพอใจ_${formatDateThaiFull(range.start)}_ถึง_${formatDateThaiFull(range.end)}.xlsx`;

      // ✅ รับไฟล์ Blob จาก Server
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // ✅ บังคับชื่อไฟล์เป็นภาษาไทย
      link.setAttribute('download', fileName);
      
      document.body.appendChild(link);
      link.click();
      
      link.remove();
      window.URL.revokeObjectURL(url);

      // ✅ แสดงชื่อไฟล์ใน Swal (สอดคล้องกับไฟล์รายงานอีกตัว)
      Swal.fire({
        icon: "success",
        title: "ดาวน์โหลดสำเร็จ",
        text: `ไฟล์ "${fileName}" ถูกบันทึกเรียบร้อยแล้ว`,
        showConfirmButton: true,
        confirmButtonText: "ปิดหน้าต่าง",
      });

    } catch (error) {
      console.error("Export Failed:", error);
      Swal.fire("Error", "ไม่สามารถดาวน์โหลดไฟล์ได้: " + error.message, "error");
    }
  };

  const changePage = (page) => {
      if (page >= 1 && page <= totalPages.value) {
          currentPage.value = page;
          fetchTableData();
      }
  };

  watch(dateFilter, (newVal) => { if (newVal !== 'custom') { currentPage.value = 1; fetchData(); } });
  const searchCustom = () => { if (dateFilter.value === 'custom') { currentPage.value = 1; fetchData(); } };

  onMounted(async () => { await fetchTopics(); await fetchData(); });

  return {
    loading, feedbacks, dateFilter, customStart, customEnd, searchCustom, stats, trendChartData, topicChartData, 
    exportToExcel,
    totalItems, currentPage, itemsPerPage, totalPages, changePage,
    selectedFloors, selectedTypes, fetchData // ✅ ส่งออกให้ ReportSatisfaction.vue เอาไปใช้
  };
}