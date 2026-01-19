import { ref, watch, onMounted, onUnmounted } from "vue";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";

export function useReportSatisfaction() {
  // --- State ---
  const loading = ref(false);
  const feedbacks = ref([]);
  const dateFilter = ref("today"); // today, week, month, all, custom
  const customStart = ref("");
  const customEnd = ref("");
  const topicsMap = ref({});

  // เก็บ Subscription ของ Realtime
  const realtimeChannel = ref(null);

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
    const now = new Date();
    const start = new Date();
    const end = new Date(); // ✅ แก้ไข: ให้ end เป็นตัวแปรที่ปรับค่าได้

    // ✅ ตั้งค่า end ให้เป็น "จบวัน" เสมอ (แก้ปัญหา Realtime ไม่ขึ้นเพราะเวลาเครื่องช้ากว่า Server)
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
      // Logic Custom Range
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
      return null; // 'all'
    }

    return { start: start.toISOString(), end: end.toISOString() };
  };

  const formatDateTH = (date) => {
    return new Date(date).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  };

  // --- 1. Fetch Topics ---
  const fetchTopics = async () => {
    const { data } = await supabase.from('feedback_topics').select('id, name').order('id');
    if (data) {
      topicsMap.value = data.reduce((acc, curr) => {
        acc[curr.id] = curr.name;
        return acc;
      }, {});
    }
  };

  // --- 2. Fetch Data ---
  const fetchData = async () => {
    // ถ้ามีข้อมูลอยู่แล้ว (เช่น Realtime update) ไม่ต้องขึ้น Loading หมุนๆ ให้รำคาญตา
    if (feedbacks.value.length === 0) loading.value = true;

    try {
      let query = supabase
        .from("feedbacks")
        .select(`
          *, 
          locations (
            locations_name,
            locations_building,
            locations_floor
          )
        `)
        .order("created_at", { ascending: false });

      const range = getDateRange(dateFilter.value);
      
      if (dateFilter.value === 'custom' && !range) {
          loading.value = false;
          return;
      }

      if (range) {
        query = query.gte("created_at", range.start).lte("created_at", range.end);
      }

      const { data, error } = await query;
      if (error) throw error;

      feedbacks.value = data;
      calculateStats(data);
      generateCharts(data);

    } catch (err) {
      console.error(err);
    } finally {
      loading.value = false;
    }
  };

  // --- 3. Calculate Stats (คงเดิม) ---
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

  // --- 4. Generate Charts (คงเดิม) ---
  const generateCharts = (data) => {
    const dateMap = {};
    data.forEach(item => {
      const date = new Date(item.created_at).toLocaleDateString("th-TH", { day: '2-digit', month: 'short' });
      if (!dateMap[date]) dateMap[date] = { sum: 0, count: 0 };
      dateMap[date].sum += Number(item.rating);
      dateMap[date].count += 1;
    });
    const labels = Object.keys(dateMap).reverse();
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

  // --- 5. Export Excel (แก้ให้ใช้ getDateRange แบบใหม่) ---
  const exportToExcel = async () => {
    try {
      const XLSX = await import("xlsx-js-style");
      const now = new Date();
      const range = getDateRange(dateFilter.value);
      let startDate = range ? new Date(range.start) : null;
      
      if (!startDate && feedbacks.value.length > 0) {
        startDate = new Date(feedbacks.value[feedbacks.value.length - 1].created_at);
      }
      
      const dateRangeStr = startDate 
        ? `ประจำวันที่ ${formatDateTH(startDate)} - ${formatDateTH(range ? range.end : now)}`
        : `ข้อมูลทั้งหมด ณ วันที่ ${formatDateTH(now)}`;

      const dataRows = feedbacks.value.map(f => {
        const dateObj = new Date(f.created_at);
        const dateStr = dateObj.toLocaleDateString("th-TH", { year: 'numeric', month: '2-digit', day: '2-digit' });
        const timeStr = dateObj.toLocaleTimeString("th-TH", { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        const row = [
          timeStr, dateStr, f.locations?.locations_name || '-', f.locations?.locations_building || '-', f.locations?.locations_floor || '-', f.rating || '-',
        ];
        const sortedTopicIds = Object.keys(topicsMap.value).sort((a, b) => Number(a) - Number(b));
        sortedTopicIds.forEach(id => {
          let score = '-';
          if (f.answers && f.answers[id] !== undefined) {
             const ans = f.answers[id];
             score = typeof ans === 'object' && ans !== null ? Number(ans.rating) : Number(ans);
          }
          row.push(score);
        });
        row.push(f.comment || '-');
        return row;
      });

      const ws_data = [
        ["รายงานคะแนนแบบประเมินความพึงพอใจการบริการด้านความสะอาด"], 
        [dateRangeStr], 
        [ "ประทับเวลา", "วัน/เดือน/ปี", "สถานที่", "อาคาร", "ชั้น", "คะแนน\nเฉลี่ย", "คะแนนแต่ละหัวข้อประเมิน", "", "", "", "", "", "", "", "", "", "", "", "", "ข้อเสนอแนะ" ],
        [ "", "", "", "", "", "", ...Object.keys(topicsMap.value).sort((a, b) => Number(a) - Number(b)).map(id => topicsMap.value[id] || `หัวข้อ ${id}`), "" ]
      ];
      dataRows.forEach(r => ws_data.push(r));
      const worksheet = XLSX.utils.aoa_to_sheet(ws_data);

      if (worksheet['!ref']) {
          const range = XLSX.utils.decode_range(worksheet['!ref']);
          for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
              const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
              if (!worksheet[cell_address]) continue;
              worksheet[cell_address].s = {
                font: { name: "TH Sarabun New", sz: 14 },
                alignment: { horizontal: "center", vertical: "center", wrapText: true },
                border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }
              };
              if (R < 4) {
                 worksheet[cell_address].s.font.normal = true; 
                 worksheet[cell_address].s.fill = { fgColor: { rgb: "EFEFEF" } };
                 if (R === 0) worksheet[cell_address].s.font.sz = 18;
              }
            }
          }
      }
      worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 19 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 19 } }, { s: { r: 2, c: 6 }, e: { r: 2, c: 18 } },
        { s: { r: 2, c: 0 }, e: { r: 3, c: 0 } }, { s: { r: 2, c: 1 }, e: { r: 3, c: 1 } }, { s: { r: 2, c: 2 }, e: { r: 3, c: 2 } }, 
        { s: { r: 2, c: 3 }, e: { r: 3, c: 3 } }, { s: { r: 2, c: 4 }, e: { r: 3, c: 4 } }, { s: { r: 2, c: 5 }, e: { r: 3, c: 5 } }, 
        { s: { r: 2, c: 19 }, e: { r: 3, c: 19 } } 
      ];
      worksheet['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, ...Array(13).fill({ wch: 15 }), { wch: 45 }];
      worksheet['!rows'] = [{ hpt: 35 }, { hpt: 30 }, { hpt: 25 }];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Feedback Report");
      XLSX.writeFile(workbook, `Feedback_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
      // สร้างชื่อไฟล์
      const fileName = `Feedback_Report_${new Date().toISOString().slice(0,10)}.xlsx`;
      
      // สั่งดาวน์โหลด
      XLSX.writeFile(workbook, fileName);
      
      // ✅✅✅ เพิ่มบรรทัดนี้: ส่งชื่อไฟล์กลับไปให้หน้าเว็บรู้
      return fileName;
    } catch (error) {
      console.error("Export Failed:", error);
      Swal.fire("Error", "ไม่สามารถดาวน์โหลดไฟล์ได้", "error");
      return null;
    }
  };

  // --- Realtime Subscription (เช็คดีๆ ว่าฟังก์ชันนี้ต้องอยู่และถูกเรียก) ---
  const subscribeRealtime = () => {
    // 1. ล้าง Channel เก่าทิ้ง
    if (realtimeChannel.value) supabase.removeChannel(realtimeChannel.value);

    // 2. สร้าง Channel ใหม่
    realtimeChannel.value = supabase
      .channel('public:feedbacks')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feedbacks' },
        () => { 
            // เมื่อมีข้อมูลใหม่ ให้โหลดข้อมูลซ้ำทันที
            fetchData(); 
        }
      )
      .subscribe();
  };

  // Watchers
  watch(dateFilter, (newVal) => {
      // ถ้าเลือก custom ไม่ต้องโหลด (รอ user กดปุ่มค้นหา)
      if (newVal !== 'custom') {
          fetchData();
      }
  });

  // Action
  const searchCustom = () => {
      if (dateFilter.value === 'custom') {
          fetchData();
      }
  };

  onMounted(async () => {
    await fetchTopics();
    await fetchData();
    // 🔥 บรรทัดนี้สำคัญมาก ห้ามหาย!
    subscribeRealtime(); 
  });

  onUnmounted(() => {
    if (realtimeChannel.value) {
        supabase.removeChannel(realtimeChannel.value);
    }
  });

  return {
    loading, feedbacks, dateFilter, customStart, customEnd, searchCustom, stats, trendChartData, topicChartData, exportToExcel
  };
}