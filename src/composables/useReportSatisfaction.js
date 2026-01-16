import { ref, watch, onMounted, onUnmounted } from "vue";
import { supabase } from "@/lib/supabase";
// ❌ ลบ import XLSX แบบ Static ออก
// import * as XLSX from "xlsx"; 
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
  const exportToExcel = async () => { // ✅ เพิ่ม async
    try {
        // ✅ เพิ่ม Dynamic Import ตรงนี้
        const XLSX = await import("xlsx");

        // 5.1 เตรียมข้อมูลหัวข้อรายงาน
        const now = new Date();
        const startDate = getDateRange(dateFilter.value) ? new Date(getDateRange(dateFilter.value)) : null; // ถ้าเป็น all จะเป็น null หรือต้องกำหนด logic เอง
        
        // Logic หา Start Date สำหรับการแสดงผล (ถ้าเลือก All อาจจะหา min date จาก data)
        let displayStartDate = startDate;
        if (!displayStartDate && feedbacks.value.length > 0) {
            displayStartDate = new Date(feedbacks.value[feedbacks.value.length - 1].created_at);
        }
        
        const dateRangeStr = displayStartDate 
            ? `ประจำวันที่ ${formatDateTH(displayStartDate)} - ${formatDateTH(now)}`
            : `ข้อมูลทั้งหมด ณ วันที่ ${formatDateTH(now)}`;

        const reportTitle = [
            ["รายงานคะแนนแบบประเมินความพึงพอใจการบริการด้านความสะอาด"],
            [dateRangeStr],
            [""] // เว้นบรรทัด
        ];

        // 5.2 เตรียมข้อมูล Rows
        const dataRows = feedbacks.value.map(f => {
            // เรียงคอลัมน์ตามที่ต้องการ
            const row = {
            'สถานที่': f.locations?.locations_name || '-',
            'อาคาร': f.locations?.locations_building || '-', 
            'ชั้น': f.locations?.locations_floor || '-',     
            'คะแนนรวม': f.rating,
            'ข้อเสนอแนะ': f.comment || '-'
            };

            // เพิ่มหัวข้อประเมิน 1-13 (เรียงตาม ID)
            // สมมติว่า topicsMap มี ID ครบ 1-13 หรือตาม Database
            const sortedTopicIds = Object.keys(topicsMap.value).sort((a, b) => Number(a) - Number(b));
            
            sortedTopicIds.forEach(id => {
            const topicName = topicsMap.value[id];
            // เช็คว่ามีคำตอบในข้อนี้ไหม ถ้ามีดึงคะแนนมาใส่
            const score = f.answers && f.answers[id] ? Number(f.answers[id].rating || f.answers[id]) : '-';
            row[topicName] = score;
            });

            return row;
        });

        // 5.3 สร้าง Worksheet
        const worksheet = XLSX.utils.json_to_sheet([]); // สร้าง sheet เปล่าก่อน

        // ใส่ Title
        XLSX.utils.sheet_add_aoa(worksheet, reportTitle, { origin: "A1" });

        // ใส่ Data ต่อจาก Title (เริ่มบรรทัดที่ 4)
        XLSX.utils.sheet_add_json(worksheet, dataRows, { origin: "A4" });

        // 5.4 จัดความกว้างคอลัมน์ (Auto Width)
        if (dataRows.length > 0) {
            const headers = Object.keys(dataRows[0]);
            const columnWidths = headers.map(key => {
            let maxLength = key.length; // ความยาว Header
            dataRows.forEach(row => {
                const cellValue = row[key] ? String(row[key]) : "";
                if (cellValue.length > maxLength) {
                maxLength = cellValue.length;
                }
            });
            return { wch: maxLength + 2 }; // เผื่อที่นิดหน่อย
            });
            worksheet['!cols'] = columnWidths;
        }

        // สร้าง Workbook และ Save
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