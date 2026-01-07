import { ref, watch, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'
import ExcelJS from 'exceljs' // ✅ เปลี่ยนมาใช้ตัวนี้เพื่อความสวยงาม
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
        .select(`*, locations (locations_name, locations_building, locations_floor), feedback_details (rating, feedback_topics (name))`)
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
      stats.value = { totalReviews: 0, averageRating: 0, starDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }, topTopic: "-", lowTopic: "-" };
      return;
    }
    const total = data.length;
    const sumRating = data.reduce((acc, cur) => acc + cur.rating, 0);
    const avg = sumRating / total;

    // Topic Analysis
    const topicScores = {};
    data.forEach((f) => {
      f.feedback_details?.forEach((d) => {
        const name = d.feedback_topics?.name || "อื่นๆ";
        if (!topicScores[name]) topicScores[name] = { sum: 0, count: 0 };
        topicScores[name].sum += d.rating;
        topicScores[name].count++;
      });
    });

    let bestTopic = { name: "-", avg: -1 };
    let worstTopic = { name: "-", avg: 6 };
    for (const [name, val] of Object.entries(topicScores)) {
      const topicAvg = val.sum / val.count;
      if (topicAvg > bestTopic.avg) bestTopic = { name, avg: topicAvg };
      if (topicAvg < worstTopic.avg) worstTopic = { name, avg: topicAvg };
    }

    stats.value = {
      totalReviews: total,
      averageRating: avg.toFixed(1),
      topTopic: bestTopic.name !== "-" ? `${bestTopic.name} (${bestTopic.avg.toFixed(1)})` : "-",
      lowTopic: worstTopic.name !== "-" ? `${worstTopic.name} (${worstTopic.avg.toFixed(1)})` : "-",
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

  // ✅ ฟังก์ชัน Export Excel ปรับปรุงใหม่ (ExcelJS + Auto Width)
  // ✅ ฟังก์ชัน Export Excel ปรับปรุงใหม่ (เพิ่มคอมเมนต์ในข้อย่อย)
// ✅ ฟังก์ชัน Export Excel (แก้ไขให้โชว์คอมเมนต์ในข้อย่อย)
  const exportToExcel = async () => {
    if (!feedbacks.value.length) {
      return Swal.fire("แจ้งเตือน", "ไม่มีข้อมูลสำหรับดาวน์โหลด", "warning");
    }

    // 1. หาหัวข้อประเมินทั้งหมด (เพื่อสร้างคอลัมน์ใน Excel)
    const allTopicsSet = new Set();
    feedbacks.value.forEach(item => {
      item.feedback_details?.forEach(d => {
        if(d.feedback_topics?.name) allTopicsSet.add(d.feedback_topics.name);
      });
    });
    const topicColumns = Array.from(allTopicsSet).sort();

    // 2. เตรียมข้อมูลสำหรับ Preview (เพิ่มตัวอย่างข้อย่อยให้เห็น)
    const previewData = feedbacks.value.slice(0, 5).map(item => {
        // ดึงตัวอย่างข้อย่อยมาโชว์สัก 1-2 อัน
        const subDetails = item.feedback_details?.map(d => {
            const commentTxt = d.comment ? `(${d.comment})` : "";
            return `${d.feedback_topics?.name}: ${d.rating} ${commentTxt}`;
        }).slice(0, 2).join(", "); // โชว์แค่ 2 อันแรกพอ เดี๋ยวรก

        return {
            date: new Date(item.created_at).toLocaleDateString("th-TH"),
            location: item.locations?.locations_name || "-",
            rating: item.rating,
            comment: item.comment || "-",
            sub_preview: subDetails || "-" // ข้อมูลตัวอย่างข้อย่อย
        }
    });

    // 3. สร้าง HTML ตารางตัวอย่าง (Preview)
    let tableHtml = `
      <div style="overflow-x: auto; font-size: 14px; text-align: left; margin-bottom: 10px; border-radius: 8px; border: 1px solid #e5e7eb;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead style="background: #f9fafb; color: #374151;">
            <tr>
              <th style="padding: 10px;">วันที่</th>
              <th style="padding: 10px;">สถานที่</th>
              <th style="padding: 10px; text-align: center;">ดาวรวม</th>
              <th style="padding: 10px;">ตัวอย่างข้อย่อย</th> 
            </tr>
          </thead>
          <tbody>
            ${previewData.map(r => `
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 8px 10px;">${r.date}</td>
                <td style="padding: 8px 10px;">${r.location}</td>
                <td style="padding: 8px 10px; text-align: center;">
                    <span style="background:${r.rating>=4?'#dcfce7':r.rating>=3?'#fef9c3':'#fee2e2'}; padding:2px 6px; border-radius:4px;">
                        ${r.rating}
                    </span>
                </td>
                <td style="padding: 8px 10px; font-size: 12px; color: #666;">
                    ${r.sub_preview} ...
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div style="text-align: right; font-size: 12px; color: #6b7280;">(ในไฟล์ Excel จะแสดงครบทุกหัวข้อ พร้อมคอมเมนต์)</div>
    `;

    // 4. ถามยืนยัน
    const result = await Swal.fire({
      title: '<strong>ตัวอย่างข้อมูลที่จะได้</strong>',
      html: tableHtml,
      icon: 'info',
      width: '700px',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: 'ยืนยันดาวน์โหลด',
      cancelButtonText: 'ยกเลิก'
    });

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

        // เพิ่มคอลัมน์หัวข้อย่อย (Dynamic)
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

            // 🔥🔥🔥 จุดที่แก้: ใส่คอมเมนต์ในข้อย่อย 🔥🔥🔥
            item.feedback_details?.forEach(d => {
                const topicName = d.feedback_topics?.name;
                if(topicName) {
                    // ถ้ามีคอมเมนต์ ให้แสดง "คะแนน" ตามด้วย "(คอมเมนต์)" ในบรรทัดใหม่
                    if (d.comment && d.comment.trim() !== "") {
                        // ใช้ \n เพื่อขึ้นบรรทัดใหม่ใน Cell ของ Excel
                        rowData[`topic_${topicName}`] = `${d.rating} \n(${d.comment})`; 
                    } else {
                        rowData[`topic_${topicName}`] = d.rating;
                    }
                }
            });

            const row = sheet.addRow(rowData);
            
            // จัดกึ่งกลาง + เปิด Wrap Text (เพื่อให้ \n ทำงาน)
            row.eachCell((cell, colNumber) => {
                cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
                
                // เช็คว่าเป็นคอลัมน์คอมเมนต์ หรือ คอลัมน์ข้อย่อย (topic_...)
                if (columns[colNumber-1].key === 'comment' || columns[colNumber-1].key.startsWith('topic_')) {
                    // wrapText: true สำคัญมาก! ไม่งั้น \n จะไม่ขึ้นบรรทัดใหม่
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
                // วัดความยาวบรรทัดที่ยาวที่สุด (เผื่อกรณีมี \n)
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