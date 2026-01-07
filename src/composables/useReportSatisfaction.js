import { ref, watch, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'
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
      stats.value = { totalReviews: 0, averageRating: 0, starDistribution: {5:0,4:0,3:0,2:0,1:0}, topTopic: "-", lowTopic: "-" };
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

  // ✅ ฟังก์ชัน Export Excel ปรับปรุงใหม่ (เพิ่ม Preview Table)
  const exportToExcel = async () => {
    // 1. เช็คข้อมูลว่าง
    if (!feedbacks.value.length) {
      return Swal.fire("แจ้งเตือน", "ไม่มีข้อมูลสำหรับดาวน์โหลด", "warning");
    }

    // 2. เตรียมข้อมูล (Formatting) - ทำทีเดียวใช้ได้ทั้ง Preview และ Excel
    const rows = feedbacks.value.map((item) => {
      const baseData = {
        วันที่: new Date(item.created_at).toLocaleDateString("th-TH"),
        เวลา: new Date(item.created_at).toLocaleTimeString("th-TH"),
        สถานที่: item.locations?.locations_name || "-",
        อาคาร: item.locations?.locations_building || "-",
        ชั้น: item.locations?.locations_floor || "-",
        คะแนนรวม: item.rating,
        คอมเมนต์: item.comment || "-",
      };

      if (item.feedback_details) {
        item.feedback_details.forEach((d) => {
          const topicName = d.feedback_topics?.name || "อื่นๆ";
          baseData[`หัวข้อ: ${topicName}`] = d.rating;
        });
      }
      return baseData;
    });

    // 3. สร้าง HTML ตารางตัวอย่าง (Preview Table) - เอาแค่ 5 แถวแรก
    const previewData = rows.slice(0, 5);
    let tableHtml = `
      <div style="overflow-x: auto; font-size: 14px; text-align: left; margin-bottom: 10px; border-radius: 8px; border: 1px solid #e5e7eb;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead style="background: #f9fafb; color: #374151;">
            <tr>
              <th style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">วันที่</th>
              <th style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">สถานที่</th>
              <th style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: 600; text-align: center;">ดาว</th>
              <th style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">คอมเมนต์</th>
            </tr>
          </thead>
          <tbody>
            ${previewData.map(r => `
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 8px 10px; color: #4b5563;">${r.วันที่}</td>
                <td style="padding: 8px 10px; color: #111827; font-weight: 500;">
                  ${r.สถานที่}<br>
                  <span style="font-size: 10px; color: #9ca3af;">${r.อาคาร} ชั้น ${r.ชั้น}</span>
                </td>
                <td style="padding: 8px 10px; text-align: center;">
                  <span style="background: ${r.คะแนนรวม >= 4 ? '#dcfce7' : r.คะแนนรวม >= 3 ? '#fef9c3' : '#fee2e2'}; color: ${r.คะแนนรวม >= 4 ? '#166534' : r.คะแนนรวม >= 3 ? '#854d0e' : '#991b1b'}; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 12px;">
                    ${r.คะแนนรวม}
                  </span>
                </td>
                <td style="padding: 8px 10px; color: #6b7280; font-size: 12px;">
                  ${r.คอมเมนต์ !== '-' ? r.คอมเมนต์.substring(0, 25) + (r.คอมเมนต์.length > 25 ? '...' : '') : '-'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div style="text-align: right; font-size: 12px; color: #6b7280; margin-top: 5px;">
        ... และรายการอื่นๆ อีก ${Math.max(0, rows.length - 5)} รายการ
      </div>
    `;

    // 4. ถามยืนยันด้วย SweetAlert2 (แบบมี Preview)
    const result = await Swal.fire({
      title: '<strong>ตัวอย่างข้อมูลที่จะ Export</strong>',
      html: tableHtml,
      icon: 'info',
      width: '650px',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: `ยืนยันดาวน์โหลด (${rows.length})`,
      cancelButtonText: 'ยกเลิก',
      reverseButtons: true,
      focusConfirm: false,
    });

    // 5. เริ่มกระบวนการสร้างไฟล์เมื่อกดยืนยัน
    if (result.isConfirmed) {
      try {
        Swal.fire({
          title: 'กำลังสร้างไฟล์...',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });

        const worksheet = XLSX.utils.json_to_sheet(rows);
        
        // จัดความกว้างคอลัมน์ให้สวยงาม
        const wscols = [
            { wch: 12 }, { wch: 10 }, { wch: 25 }, { wch: 10 }, 
            { wch: 5 }, { wch: 10 }, { wch: 40 }
        ];
        worksheet["!cols"] = wscols;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
        
        // Save File
        XLSX.writeFile(workbook, `feedback_report_${new Date().toISOString().split("T")[0]}.xlsx`);
        
        Swal.close(); // ปิด Loading เมื่อเสร็จ

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