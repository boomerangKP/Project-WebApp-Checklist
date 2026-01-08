import { ref, watch, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import Swal from 'sweetalert2'

export function useReportSatisfaction() {
  const loading = ref(true)
  const feedbacks = ref([])
  const dateFilter = ref("month")
  
  const stats = ref({
    totalReviews: 0,
    averageRating: 0,
    starDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    topTopic: "-",
    lowTopic: "-",
  })

  const trendChartData = ref({ labels: [], datasets: [] })
  const topicChartData = ref({ labels: [], datasets: [] })

  // --- Helpers ---
  const getDateRange = (filter) => {
    const now = new Date();
    if (filter === "today") return new Date(now.setHours(0, 0, 0, 0)).toISOString();
    if (filter === "week") {
      const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString();
    }
    if (filter === "month") {
      const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString();
    }
    if (filter === "year") {
      const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.toISOString();
    }
    return null;
  };

  // --- Fetch & Calculate ---
  const fetchData = async () => {
    loading.value = true;
    try {
      let query = supabase.from("feedbacks")
        .select(`
          *, 
          locations (locations_name, locations_building, locations_floor), 
          feedback_details (
            rating, 
            comment, 
            feedback_topics (name, ordering)
          )
        `)
        .order("created_at", { ascending: false });

      const startDate = getDateRange(dateFilter.value);
      if (startDate) query = query.gte("created_at", startDate);

      const { data, error } = await query;
      if (error) throw error;

      feedbacks.value = data || [];
      calculateStats(data);
      prepareCharts(data);
    } catch (err) {
      console.error("Error fetching report:", err);
    } finally {
      loading.value = false;
    }
  };

  const calculateStats = (data) => {
    if (!data || !data.length) {
      // ค่าเริ่มต้น (Default)
      stats.value = { 
        totalReviews: 0, 
        averageRating: 0, 
        topTopic: "-", 
        topScore: 0, // ✅ เพิ่มตัวแปรเก็บคะแนน
        lowTopic: "-",
        lowScore: 0  // ✅ เพิ่มตัวแปรเก็บคะแนน
      };
      return;
    }

    const total = data.length;
    const sumRating = data.reduce((acc, cur) => acc + cur.rating, 0);
    const avg = sumRating / total;

    // Topic Analysis
    const topicScores = {};
    data.forEach((f) => {
      f.feedback_details?.forEach((d) => {
        // ดึงชื่อหัวข้อ ถ้าไม่มีให้ใช้ ID แทน
        const name = d.feedback_topics?.name || `หัวข้อ ${d.topic_id}`;
        
        if (!topicScores[name]) topicScores[name] = { sum: 0, count: 0 };
        topicScores[name].sum += d.rating;
        topicScores[name].count++;
      });
    });

    // หามากสุด / น้อยสุด
    let bestTopic = { name: "-", avg: -1 };
    let worstTopic = { name: "-", avg: 6 }; // ตั้งไว้ 6 เพื่อให้ค่าแรกที่เข้ามาต่ำกว่าเสมอ

    for (const [name, val] of Object.entries(topicScores)) {
      const topicAvg = val.sum / val.count;
      
      // หา Top (ต้องมากกว่าเดิม หรือถ้าเท่ากันให้เอาอันใหม่)
      if (topicAvg >= bestTopic.avg) {
        bestTopic = { name, avg: topicAvg };
      }
      // หา Low (ต้องน้อยกว่าเดิม)
      if (topicAvg <= worstTopic.avg) {
        worstTopic = { name, avg: topicAvg };
      }
    }

    // กรณีข้อมูลน้อย หรือคะแนนเท่ากันหมด ให้จัดการค่า Default
    if (bestTopic.avg === -1) bestTopic = { name: "ยังไม่มีข้อมูล", avg: 0 };
    if (worstTopic.avg === 6) worstTopic = { name: "-", avg: 0 };

    stats.value = {
      totalReviews: total,
      averageRating: avg.toFixed(1),
      // ✅ ส่งแยกกัน Name ส่วน Name, Score ส่วน Score
      topTopic: bestTopic.name,
      topScore: bestTopic.avg.toFixed(1),
      lowTopic: worstTopic.name,
      lowScore: worstTopic.avg.toFixed(1),
    };
  };

  const prepareCharts = (data) => {
    // 1. Line Chart
    const dateMap = {};
    data.forEach((f) => {
      const d = new Date(f.created_at).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
      if (!dateMap[d]) dateMap[d] = { sum: 0, count: 0 };
      dateMap[d].sum += f.rating; dateMap[d].count++;
    });
    const labels = Object.keys(dateMap).reverse();
    const trendData = labels.map((d) => (dateMap[d].sum / dateMap[d].count).toFixed(1));

    trendChartData.value = {
      labels: labels,
      datasets: [{
        label: "คะแนนความพึงพอใจเฉลี่ย",
        data: trendData,
        borderColor: "#4f46e5",
        backgroundColor: "rgba(79, 70, 229, 0.1)",
        fill: true,
        tension: 0.4,
      }],
    };

    // 2. Bar Chart
    const topicMap = {};
    data.forEach((f) => {
      f.feedback_details?.forEach((d) => {
        const name = d.feedback_topics?.name;
        if (name) {
          if (!topicMap[name]) topicMap[name] = { sum: 0, count: 0 };
          topicMap[name].sum += d.rating; topicMap[name].count++;
        }
      });
    });
    const topicLabels = Object.keys(topicMap);
    const topicScores = topicLabels.map((t) => (topicMap[t].sum / topicMap[t].count).toFixed(1));

    topicChartData.value = {
      labels: topicLabels,
      datasets: [{
        label: "คะแนนเฉลี่ยรายหัวข้อ",
        data: topicScores,
        backgroundColor: topicScores.map((s) => s >= 4 ? "#10b981" : s >= 3 ? "#f59e0b" : "#ef4444"),
        borderRadius: 6,
      }],
    };
  };

  // ✅ ฟังก์ชัน Export Excel (ปรับปรุง: เอา Preview ตารางออก เหลือแค่ถามยืนยัน)
  const exportToExcel = async () => {
    if (!feedbacks.value.length) {
      return Swal.fire("แจ้งเตือน", "ไม่มีข้อมูลสำหรับดาวน์โหลด", "warning");
    }

    // 1. หาหัวข้อประเมินทั้งหมด + เก็บ Ordering (เพื่อเรียงคอลัมน์ให้ถูก)
    const topicMap = new Map(); 
    feedbacks.value.forEach(item => {
      item.feedback_details?.forEach(d => {
        const t = d.feedback_topics;
        if(t?.name) {
             if (!topicMap.has(t.name)) {
                 topicMap.set(t.name, t.ordering || 999);
             }
        }
      });
    });
    
    // เรียงคอลัมน์ตาม Ordering
    const topicColumns = Array.from(topicMap.keys()).sort((a, b) => {
        return topicMap.get(a) - topicMap.get(b);
    });

    // 2. ❌ ลบส่วน HTML Table Preview ออกตามที่ขอ

    // 3. ถามยืนยันด้วย SweetAlert แบบเรียบง่าย
    const result = await Swal.fire({
      title: 'ดาวน์โหลดรายงาน?',
      text: `พบข้อมูลทั้งหมด ${feedbacks.value.length} รายการ ต้องการสร้างไฟล์ Excel หรือไม่?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: 'ดาวน์โหลด',
      cancelButtonText: 'ยกเลิก'
    });

    // 4. ถ้ากดยืนยัน -> สร้างไฟล์ (Logic เดิม)
    if (result.isConfirmed) {
      try {
        Swal.fire({ title: 'กำลังสร้างไฟล์...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Feedback Report');

        // A. กำหนด Columns
        const columns = [
          { header: 'วันที่', key: 'date' },
          { header: 'เวลา', key: 'time' },
          { header: 'สถานที่', key: 'location' },
          { header: 'อาคาร', key: 'building' },
          { header: 'ชั้น', key: 'floor' },
          { header: 'คะแนนรวม', key: 'total_rating' },
          { header: 'คอมเมนต์หลัก', key: 'comment' },
        ];

        // เพิ่มคอลัมน์หัวข้อย่อย
        topicColumns.forEach(topic => {
            columns.push({ header: `หัวข้อ: ${topic}`, key: `topic_${topic}` });
        });

        sheet.columns = columns;

        // B. แต่งหัวตาราง
        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
        headerRow.height = 30;

        // C. ใส่ข้อมูล
        feedbacks.value.forEach(item => {
            const dateObj = new Date(item.created_at);
            
            const rowData = {
                date: dateObj.toLocaleDateString("th-TH", { year: 'numeric', month: '2-digit', day: '2-digit' }),
                time: dateObj.toLocaleTimeString("th-TH", { hour: '2-digit', minute: '2-digit' }),
                location: item.locations?.locations_name || "-",
                building: item.locations?.locations_building || "-",
                floor: Number(item.locations?.locations_floor) || item.locations?.locations_floor,
                total_rating: item.rating,
                comment: item.comment || "-"
            };

            // ใส่คอมเมนต์ในข้อย่อย
            item.feedback_details?.forEach(d => {
                const topicName = d.feedback_topics?.name;
                if(topicName) {
                    if (d.comment && d.comment.trim() !== "") {
                        rowData[`topic_${topicName}`] = `${d.rating} \n(${d.comment})`; 
                    } else {
                        rowData[`topic_${topicName}`] = d.rating;
                    }
                }
            });

            const row = sheet.addRow(rowData);
            
            // จัดกึ่งกลาง + เปิด Wrap Text
            row.eachCell((cell, colNumber) => {
                cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
                
                if (columns[colNumber-1].key === 'comment' || columns[colNumber-1].key.startsWith('topic_')) {
                    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                } else {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                }
            });
            
            // สีคะแนนรวม
            const ratingCell = row.getCell('total_rating');
            if(item.rating >= 5) ratingCell.font = { color: { argb: 'FF166534' }, bold: true };
            else if(item.rating <= 2) ratingCell.font = { color: { argb: 'FF991B1B' }, bold: true };
        });

        // D. Auto Width
        sheet.columns.forEach(column => {
            let maxLength = 0;
            column.eachCell({ includeEmpty: true }, cell => {
                const valStr = cell.value ? cell.value.toString() : "";
                const lines = valStr.split('\n');
                const maxLineLen = Math.max(...lines.map(l => l.length));
                if (maxLineLen > maxLength) maxLength = maxLineLen;
            });
            column.width = Math.min(Math.max(maxLength + 4, 12), 50);
        });

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Satisfaction_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
        
        Swal.close();

      } catch (err) {
        console.error(err);
        Swal.fire('Error', 'เกิดข้อผิดพลาดในการสร้างไฟล์', 'error');
      }
    }
  };

  watch(dateFilter, () => fetchData());
  onMounted(fetchData);

  return { loading, feedbacks, dateFilter, stats, trendChartData, topicChartData, exportToExcel, fetchData };
}