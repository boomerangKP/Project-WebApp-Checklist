import { ref, computed, watch, onMounted } from "vue";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";

export function useReportSatisfaction() {
  // --- State ---
  const loading = ref(false);
  const feedbacks = ref([]);
  const dateFilter = ref("today"); // today, week, month, all
  const topicsMap = ref({});

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

  // --- 1. Fetch Topics ---
  const fetchTopics = async () => {
    const { data } = await supabase.from('feedback_topics').select('id, name');
    if (data) {
      topicsMap.value = data.reduce((acc, curr) => {
        acc[curr.id] = curr.name;
        return acc;
      }, {});
    }
  };

  // --- 2. Fetch Data ---
  const fetchData = async () => {
    loading.value = true;
    try {
      let query = supabase
        .from("feedbacks")
        .select("*, locations(locations_name)")
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
      console.error(err);
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

  // --- 5. Export Excel (ปรับปรุงใหม่: Auto Width) ---
  const exportToExcel = () => {
    // 1. เตรียมข้อมูล
    const rows = feedbacks.value.map(f => {
      const row = {
        'วันที่': new Date(f.created_at).toLocaleString('th-TH'),
        'สถานที่': f.locations?.locations_name || '-',
        'คะแนนรวม': f.rating,
        'ข้อเสนอแนะ': f.comment || '-'
      };
      
      if (f.answers) {
        Object.entries(f.answers).forEach(([key, val]) => {
          const topicName = topicsMap.value[key] || `ข้อ ${key}`;
          row[topicName] = Number(val.rating || val);
        });
      }
      return row;
    });

    // 2. สร้าง Worksheet
    const worksheet = XLSX.utils.json_to_sheet(rows);

    // 🔥 3. คำนวณความกว้างคอลัมน์อัตโนมัติ (Auto Width)
    if (rows.length > 0) {
      // ดึง Header ทั้งหมด
      const headers = Object.keys(rows[0]);
      
      const columnWidths = headers.map(key => {
        // เริ่มต้นความกว้างด้วยความยาวของ Header
        let maxLength = key.length;

        // วนลูปเช็คข้อมูลในคอลัมน์นั้น ว่าอันไหนยาวสุด
        rows.forEach(row => {
          const cellValue = row[key] ? String(row[key]) : "";
          if (cellValue.length > maxLength) {
            maxLength = cellValue.length;
          }
        });

        // เผื่อพื้นที่ให้อีกนิดหน่อย (+5 ตัวอักษร)
        return { wch: maxLength + 5 };
      });

      // ตั้งค่าความกว้างให้ Worksheet
      worksheet['!cols'] = columnWidths;
    }

    // 4. สร้าง Workbook และบันทึก
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Feedback Report");
    XLSX.writeFile(workbook, `Feedback_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // Watchers & Lifecycle
  watch(dateFilter, () => fetchData());
  
  onMounted(async () => {
    await fetchTopics();
    await fetchData();
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