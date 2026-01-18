import { ref, watch, onMounted, onUnmounted } from "vue";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";

export function useReportSatisfaction() {
  // --- State ---
  const loading = ref(false);
  const feedbacks = ref([]);
  const dateFilter = ref("today"); // today, week, month, all
  const topicsMap = ref({});

  // ตัวแปรสำหรับเก็บช่องสัญญาณ Realtime
  const realtimeChannel = ref(null);

  const stats = ref({
    totalReviews: 0,
    averageRating: "0.0",
    topTopic: "-",
    topScore: "0.0",
    lowTopic: "-",
    lowScore: "0.0",
  });

  // --- Chart Data State ---
  const trendChartData = ref({ labels: [], datasets: [] });
  const topicChartData = ref({ labels: [], datasets: [] });

  // --- Helper: Get Date Range ---
  const getDateRange = (filter) => {
    const now = new Date();
    const start = new Date();

    if (filter === 'today') {
      start.setHours(0, 0, 0, 0);
    } else if (filter === 'week') {
      const day = start.getDay() || 7;
      if (day !== 1) start.setHours(-24 * (day - 1));
      start.setHours(0, 0, 0, 0);
    } else if (filter === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    } else {
      return null;
    }

    return start.toISOString();
  };

  // ✅ Helper: Format Date for Excel Header
  const formatDateTH = (date) => {
    return new Date(date).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  };

  // --- 1. Fetch Topics ---
  const fetchTopics = async () => {
    const { data } = await supabase.from('feedback_topics').select('id, name').order('id'); // order by id เพื่อให้เรียงตาม 1-13
    if (data) {
      topicsMap.value = data.reduce((acc, curr) => {
        acc[curr.id] = curr.name;
        return acc;
      }, {});
    }
  };

  // --- 2. Fetch Data ---
  const fetchData = async () => {
    // โหลดหมุนติ้วๆ เฉพาะตอนแรกที่ยังไม่มีข้อมูล
    if (feedbacks.value.length === 0) loading.value = true;

    try {
      // ✅ คงไว้: locations_building และ locations_floor
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

      const startDate = getDateRange(dateFilter.value);
      if (startDate) {
        query = query.gte("created_at", startDate);
      }

      const { data, error } = await query;
      if (error) throw error;

      feedbacks.value = data;
      calculateStats(data);
      generateCharts(data);

    } catch (err) {
      console.error(err); // เก็บ error log ไว้ดูเวลาพังจริงเท่านั้น
      Swal.fire("Error", "ดึงข้อมูลไม่สำเร็จ", "error");
    } finally {
      loading.value = false;
    }
  };

  // --- 3. Calculate Stats ---
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

    let max = -1;
    let min = 6;
    let topName = "-";
    let lowName = "-";

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

  // --- 4. Generate Charts ---
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

    const topicLabels = [];
    const topicValues = [];

    Object.keys(topicsMap.value).forEach(id => {
       if (topicScores[id]) {
         topicLabels.push(topicsMap.value[id]);
         topicValues.push((topicScores[id].sum / topicScores[id].count).toFixed(2));
       }
    });

    topicChartData.value = {
      labels: topicLabels,
      datasets: [{
        label: 'คะแนนเฉลี่ย',
        data: topicValues,
        backgroundColor: '#10b981',
        borderRadius: 6
      }]
    };
  };

  // --- 5. ✅ Export Excel (Dynamic Import Version) ---
const exportToExcel = async () => {
    try {
      // ✅ เรียกใช้ library xlsx-js-style เพื่อแต่งสวย
      const XLSX = await import("xlsx-js-style");

      // 1. เตรียมข้อมูล Header
      const now = new Date();
      let startDate = getDateRange(dateFilter.value) ? new Date(getDateRange(dateFilter.value)) : null;
      if (!startDate && feedbacks.value.length > 0) {
        startDate = new Date(feedbacks.value[feedbacks.value.length - 1].created_at);
      }
      
      const dateRangeStr = startDate 
        ? `ประจำวันที่ ${formatDateTH(startDate)} - ${formatDateTH(now)}`
        : `ข้อมูลทั้งหมด ณ วันที่ ${formatDateTH(now)}`;

      // 2. เตรียมข้อมูล Rows
      const dataRows = feedbacks.value.map(f => {
        const dateObj = new Date(f.created_at);
        const dateStr = dateObj.toLocaleDateString("th-TH", { year: 'numeric', month: '2-digit', day: '2-digit' });
        
        // ✅ แก้ไข: เอาเฉพาะ "เวลา" (รวมวินาที) ไม่เอาวันที่
        const timeStr = dateObj.toLocaleTimeString("th-TH", { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        const row = [
          timeStr,                                // A: ประทับเวลา (เฉพาะเวลา)
          dateStr,                                // B: วัน/เดือน/ปี
          f.locations?.locations_name || '-',     // C: สถานที่
          f.locations?.locations_building || '-', // D: อาคาร
          f.locations?.locations_floor || '-',    // E: ชั้น
          f.rating || '-',                        // F: คะแนนเฉลี่ย
        ];

        // คะแนนหัวข้อ 1-13
        const sortedTopicIds = Object.keys(topicsMap.value).sort((a, b) => Number(a) - Number(b));
        sortedTopicIds.forEach(id => {
          let score = '-';
          if (f.answers && f.answers[id] !== undefined) {
             const ans = f.answers[id];
             score = typeof ans === 'object' && ans !== null ? Number(ans.rating) : Number(ans);
          }
          row.push(score);
        });

        // ข้อเสนอแนะ
        row.push(f.comment || '-');

        return row;
      });

      // 3. สร้างข้อมูลลง Array แบบ 2 มิติ
      const ws_data = [
        ["รายงานคะแนนแบบประเมินความพึงพอใจการบริการด้านความสะอาด"], 
        [dateRangeStr], 
        [ 
          "ประทับเวลา", "วัน/เดือน/ปี", "สถานที่", "อาคาร", "ชั้น", "คะแนน\nเฉลี่ย", 
          "คะแนนแต่ละหัวข้อประเมิน", "", "", "", "", "", "", "", "", "", "", "", "", 
          "ข้อเสนอแนะ" 
        ],
        [ 
          "", "", "", "", "", "", 
          ...Object.keys(topicsMap.value).sort((a, b) => Number(a) - Number(b)).map(id => topicsMap.value[id] || `หัวข้อ ${id}`), 
          "" 
        ]
      ];

      // รวม Data Rows
      dataRows.forEach(r => ws_data.push(r));

      // สร้าง Worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(ws_data);

      // 4. ✅ การใส่ Style (จัดกลาง + ฟอนต์ + เส้นขอบ)
      // วนลูปทุก Cell ใน Sheet เพื่อใส่ Style
      const range = XLSX.utils.decode_range(worksheet['!ref']); // หาขอบเขตข้อมูลทั้งหมด
      
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
          if (!worksheet[cell_address]) continue;

          // กำหนด Style พื้นฐาน
          worksheet[cell_address].s = {
            font: { 
                name: "TH Sarabun New", // หรือ font อื่นที่เครื่องมี
                sz: 14 // ✅ ปรับขนาดฟอนต์ตรงนี้ (14, 16, 18...)
            },
            alignment: { 
                horizontal: "center", // ✅ จัดกึ่งกลางแนวนอน
                vertical: "center",   // ✅ จัดกึ่งกลางแนวตั้ง
                wrapText: true        // ตัดบรรทัดอัตโนมัติ
            },
            border: { // ✅ ใส่เส้นขอบ
                top: { style: "thin" },
                bottom: { style: "thin" },
                left: { style: "thin" },
                right: { style: "thin" }
            }
          };

          // (Optional) ปรับ Style พิเศษสำหรับหัวตาราง (แถว 1-4) ให้ตัวหนา
          if (R < 4) {
             worksheet[cell_address].s.font.bold = true;
             worksheet[cell_address].s.fill = { fgColor: { rgb: "EFEFEF" } }; // ใส่สีพื้นหลังเทาอ่อนๆ
             if (R === 0) worksheet[cell_address].s.font.sz = 18; // ชื่อรายงานตัวใหญ่หน่อย
          }
        }
      }

      // 5. กำหนด Merge Cells (เหมือนเดิม)
      worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 19 } }, 
        { s: { r: 1, c: 0 }, e: { r: 1, c: 19 } },
        { s: { r: 2, c: 6 }, e: { r: 2, c: 18 } },
        { s: { r: 2, c: 0 }, e: { r: 3, c: 0 } }, 
        { s: { r: 2, c: 1 }, e: { r: 3, c: 1 } }, 
        { s: { r: 2, c: 2 }, e: { r: 3, c: 2 } }, 
        { s: { r: 2, c: 3 }, e: { r: 3, c: 3 } }, 
        { s: { r: 2, c: 4 }, e: { r: 3, c: 4 } }, 
        { s: { r: 2, c: 5 }, e: { r: 3, c: 5 } }, 
        { s: { r: 2, c: 19 }, e: { r: 3, c: 19 } } 
      ];

      // 6. กำหนดความกว้างคอลัมน์
      worksheet['!cols'] = [
        { wch: 12 }, // A: Time (เล็กลงหน่อยเพราะไม่มีวันที่แล้ว)
        { wch: 15 }, // B: Date
        { wch: 20 }, // C: Location
        { wch: 10 }, // D: Building
        { wch: 8 },  // E: Floor
        { wch: 10 }, // F: Score
        ...Array(13).fill({ wch: 15 }), // G-S
        { wch: 45 }  // T: Comment
      ];

      // 7. เพิ่มส่วนนี้เพื่อกำหนดความสูงของแถว (Row Height)
      worksheet['!rows'] = [
        { hpt: 35 },  // แถวที่ 1 (Title)
        { hpt: 30 },  // แถวที่ 2 (Date Range)
        { hpt: 25 },  // แถวที่ 3 (Header หลัก)
        // แถวอื่นๆ ที่เหลือจะใช้ความสูง default ของ Excel อัตโนมัติ
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Feedback Report");
      XLSX.writeFile(workbook, `Feedback_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
    
    } catch (error) {
      console.error("Export Failed:", error);
      Swal.fire("Error", "ไม่สามารถดาวน์โหลดไฟล์ได้", "error");
    }
  };

  // 🔥🔥🔥 Realtime Subscription Logic (Clean Version) 🔥🔥🔥
  const subscribeRealtime = () => {
    // ล้าง Channel เก่าทิ้งก่อน (ถ้ามี)
    if (realtimeChannel.value) supabase.removeChannel(realtimeChannel.value);

    // สร้าง Channel ใหม่
    realtimeChannel.value = supabase
      .channel('public:feedbacks')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feedbacks' },
        () => {
          // เมื่อได้รับข้อมูลใหม่ สั่งดึงข้อมูลทันที (ไม่ต้อง log อะไร)
          fetchData();
        }
      )
      .subscribe();
  };

  // Watchers & Lifecycle
  watch(dateFilter, () => fetchData());

  onMounted(async () => {
    await fetchTopics();
    await fetchData();
    // เริ่มฟัง Realtime
    subscribeRealtime();
  });

  // ยกเลิกการฟังเมื่อปิดหน้าเว็บ
  onUnmounted(() => {
    if (realtimeChannel.value) {
        supabase.removeChannel(realtimeChannel.value);
    }
  });

  return {
    loading,
    feedbacks,
    dateFilter,
    stats,
    trendChartData,
    topicChartData,
    exportToExcel
  };
}