import { ref, watch, onMounted, onUnmounted, computed } from "vue";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";
import * as XLSX from "xlsx"; // ✅ ใช้ตัวธรรมดา (เบาหวิว)

export function useReportSatisfaction() {
  // --- State ---
  const loading = ref(false);
  const feedbacks = ref([]);
  const dateFilter = ref("today");
  const customStart = ref("");
  const customEnd = ref("");
  const topicsMap = ref({});
  const realtimeChannel = ref(null);

  // ✅ Pagination State
  const currentPage = ref(1);
  const itemsPerPage = ref(50);
  const totalItems = ref(0);
  const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value) || 1);

  // Stats Data
  const stats = ref({
    totalReviews: 0,
    averageRating: "0.0",
    topTopic: "-",
    topScore: "0.0",
    lowTopic: "-",
    lowScore: "0.0",
  });

  const trendChartData = ref({ labels: [], datasets: [] });
  const topicChartData = ref({ labels: [], datasets: [] });

  // --- Helper: Get Date Range ---
  const getDateRange = (filter) => {
    const start = new Date();
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    if (filter === 'today') {
      start.setHours(0, 0, 0, 0);
    } else if (filter === 'week') {
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
      
      const diffTime = Math.abs(e - s);
      const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30);
      if (diffMonths > 4) {
         Swal.fire("ช่วงเวลาเกินกำหนด", "กรุณาเลือกช่วงเวลาไม่เกิน 4 เดือน", "warning");
         return null;
      }
      return { start: s.toISOString(), end: e.toISOString() };
    } else {
      return null;
    }
    return { start: start.toISOString(), end: end.toISOString() };
  };

  const formatDateTH = (date) => {
    return new Date(date).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
  };

  const fetchTopics = async () => {
    const { data } = await supabase.from('feedback_topics').select('id, name').order('id');
    if (data) {
      topicsMap.value = data.reduce((acc, curr) => {
        acc[curr.id] = curr.name;
        return acc;
      }, {});
    }
  };

  // ✅ Helper: Loop Fetch
  const fetchAllData = async (selectColumns = '*') => {
      const range = getDateRange(dateFilter.value);
      if (dateFilter.value === 'custom' && !range) return [];

      let allData = [];
      let page = 0;
      let pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
          const from = page * pageSize;
          const to = from + pageSize - 1;

          let query = supabase
              .from("feedbacks")
              .select(selectColumns)
              .order("created_at", { ascending: true })
              .range(from, to);

          if (range) {
              query = query.gte("created_at", range.start).lte("created_at", range.end);
          }

          const { data, error } = await query;
          if (error) throw error;

          if (data && data.length > 0) {
              allData = allData.concat(data);
          }

          if (!data || data.length < pageSize) {
              hasMore = false;
          } else {
              page++;
          }
      }
      return allData;
  };

  // ✅ 1. Fetch Table
  const fetchTableData = async () => {
    try {
        const range = getDateRange(dateFilter.value);
        if (dateFilter.value === 'custom' && !range) return;

        const from = (currentPage.value - 1) * itemsPerPage.value;
        const to = from + itemsPerPage.value - 1;

        let query = supabase
            .from("feedbacks")
            .select(`
                *,
                locations (locations_name, locations_building, locations_floor)
            `, { count: 'exact' })
            .order("created_at", { ascending: false })
            .range(from, to);

        if (range) {
            query = query.gte("created_at", range.start).lte("created_at", range.end);
        }

        const { data, count, error } = await query;
        if (error) throw error;

        feedbacks.value = data;
        totalItems.value = count || 0;

    } catch (err) {
        console.error("Fetch Table Error:", err);
    }
  };

  // ✅ 2. Fetch Stats
  const fetchStatsData = async () => {
    try {
        const allData = await fetchAllData('rating, answers, created_at');
        calculateStats(allData);
        generateCharts(allData);
    } catch (err) {
        console.error("Fetch Stats Error:", err);
    }
  };

  const fetchData = async () => {
    loading.value = true;
    await Promise.all([fetchTableData(), fetchStatsData()]);
    loading.value = false;
  };

  const changePage = (page) => {
      if (page >= 1 && page <= totalPages.value) {
          currentPage.value = page;
          fetchTableData();
      }
  };

  const calculateStats = (data) => {
    if (!data.length) {
      stats.value = { totalReviews: 0, averageRating: "0.0", topTopic: "-", topScore: "0.0", lowTopic: "-", lowScore: "0.0" };
      return;
    }
    let sumRating = 0;
    const topicScores = {};
    
    data.forEach((item) => {
      sumRating += Number(item.rating || 0);
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

  // ✅ Export Excel (แก้ไขให้ Dynamic ตรงเป๊ะ)
  const exportToExcel = async () => {
    try {
      const now = new Date();
      const range = getDateRange(dateFilter.value);
      
      const exportData = await fetchAllData('*, locations(locations_name, locations_building, locations_floor)');

      if (!exportData || exportData.length === 0) {
          Swal.fire("ไม่มีข้อมูล", "ไม่พบข้อมูลในช่วงเวลาที่เลือก", "warning");
          return null;
      }

      let startDate = range ? new Date(range.start) : null;
      if (!startDate) {
        startDate = new Date(exportData[exportData.length - 1].created_at);
      }

      const dateRangeStr = startDate
        ? `ประจำวันที่ ${formatDateTH(startDate)} - ${formatDateTH(range ? range.end : now)}`
        : `ข้อมูลทั้งหมด ณ วันที่ ${formatDateTH(now)}`;

      // 1. เรียง ID หัวข้อให้แน่นอนก่อน
      const sortedTopicIds = Object.keys(topicsMap.value).sort((a, b) => Number(a) - Number(b));
      
      const dataRows = exportData.map(f => {
        const dateObj = new Date(f.created_at);
        const dateStr = dateObj.toLocaleDateString("th-TH", { year: 'numeric', month: '2-digit', day: '2-digit' });
        const timeStr = dateObj.toLocaleTimeString("th-TH", { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const row = [
          timeStr, dateStr, f.locations?.locations_name || '-', f.locations?.locations_building || '-', f.locations?.locations_floor || '-', f.rating || '-',
        ];
        
        sortedTopicIds.forEach(id => {
          let score = '-';
          if (f.answers && f.answers[id] !== undefined) {
             const ans = f.answers[id];
             score = typeof ans === 'object' && ans !== null ? Number(ans.rating) : Number(ans);
          }
          row.push(score);
        });
        row.push(f.comment || '-'); // Comment อยู่ท้ายสุด
        return row;
      });

      // 2. สร้างหัวตาราง (Header) ให้จำนวนช่องตรงกับข้อมูลเป๊ะๆ
      const topicNames = sortedTopicIds.map(id => topicsMap.value[id] || `หัวข้อ ${id}`);
      const topicCount = topicNames.length; 

      const ws_data = [
        ["รายงานคะแนนแบบประเมินความพึงพอใจการบริการด้านความสะอาด"],
        [dateRangeStr],
        [ 
            "ประทับเวลา", "วัน/เดือน/ปี", "สถานที่", "อาคาร", "ชั้น", "คะแนน\nเฉลี่ย", 
            "คะแนนแต่ละหัวข้อประเมิน", ...Array(topicCount - 1).fill(""), 
            "ข้อเสนอแนะ" 
        ],
        [ 
            "", "", "", "", "", "", 
            ...topicNames, 
            "" 
        ]
      ];
      
      dataRows.forEach(r => ws_data.push(r));

      // สร้าง Workbook
      const worksheet = XLSX.utils.aoa_to_sheet(ws_data);
      
      // 3. แก้ Merge Cells ให้สัมพันธ์กับจำนวนหัวข้อจริง (Dynamic)
      const lastColIndex = 6 + topicCount; // 6 คือจำนวนคอลัมน์แรกๆ + จำนวนหัวข้อ

      worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: lastColIndex } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: lastColIndex } },
        // Merge "คะแนนแต่ละหัวข้อประเมิน" (เริ่มที่ col 6)
        { s: { r: 2, c: 6 }, e: { r: 2, c: 5 + topicCount } },
        
        // Merge แนวตั้ง (Header ซ้ายมือ)
        { s: { r: 2, c: 0 }, e: { r: 3, c: 0 } }, 
        { s: { r: 2, c: 1 }, e: { r: 3, c: 1 } },
        { s: { r: 2, c: 2 }, e: { r: 3, c: 2 } }, 
        { s: { r: 2, c: 3 }, e: { r: 3, c: 3 } },
        { s: { r: 2, c: 4 }, e: { r: 3, c: 4 } }, 
        { s: { r: 2, c: 5 }, e: { r: 3, c: 5 } },
        
        // Merge แนวตั้ง (Header ขวาสุด "ข้อเสนอแนะ")
        { s: { r: 2, c: lastColIndex }, e: { r: 3, c: lastColIndex } } 
      ];

      worksheet['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, ...Array(topicCount).fill({ wch: 15 }), { wch: 45 }];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Feedback Report");

      XLSX.writeFile(workbook, `Feedback_Report_${new Date().toISOString().slice(0,10)}.xlsx`);

      return "Feedback_Report.xlsx";
    } catch (error) {
      console.error("Export Failed:", error);
      Swal.fire("Error", "ไม่สามารถดาวน์โหลดไฟล์ได้", "error");
      return null;
    }
  };

  const subscribeRealtime = () => {
    if (realtimeChannel.value) supabase.removeChannel(realtimeChannel.value);
    realtimeChannel.value = supabase
      .channel('public:feedbacks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedbacks' }, () => {
          fetchTableData();
          fetchStatsData();
      })
      .subscribe();
  };

  watch(dateFilter, (newVal) => {
      if (newVal !== 'custom') {
          currentPage.value = 1;
          fetchData();
      }
  });

  const searchCustom = () => {
      if (dateFilter.value === 'custom') {
          currentPage.value = 1;
          fetchData();
      }
  };

  onMounted(async () => {
    await fetchTopics();
    await fetchData();
    subscribeRealtime();
  });

  onUnmounted(() => {
    if (realtimeChannel.value) {
        supabase.removeChannel(realtimeChannel.value);
    }
  });

  return {
    loading, feedbacks, dateFilter, customStart, customEnd, searchCustom, stats, trendChartData, topicChartData, exportToExcel,
    totalItems, currentPage, itemsPerPage, totalPages, changePage
  };
}