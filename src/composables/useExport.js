// src/composables/useExport.js
import { ref } from "vue";
import { supabase } from "@/lib/supabase";
import { useSwal } from "@/composables/useSwal";

export function useExport() {
  const { Swal } = useSwal();
  const isExporting = ref(false);

  // Helper: แปลงวันที่เป็นไทยสำหรับตั้งชื่อไฟล์ (เช่น 01-มกราคม-2567)
  const formatDateThaiFull = (date) => {
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = d.toLocaleDateString("th-TH", { month: 'long' });
    const year = d.toLocaleDateString("th-TH", { year: 'numeric' });
    return `${day}-${month}-${year}`;
  };

  // Helper: แปลงวันที่เป็นไทยสำหรับแสดงใน Dialog (เช่น 1 มกราคม 2567)
  const formatDateThaiDisplay = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString("th-TH", { dateStyle: "long" });
  };

  /**
   * ฟังก์ชันหลักสำหรับ Export Excel
   * @param {Object} options
   * @param {string} options.functionName - ชื่อ Edge Function (เช่น 'export-satisfaction')
   * @param {Date|string} options.startDate - วันเริ่มต้น
   * @param {Date|string} options.endDate - วันสิ้นสุด
   * @param {string} options.filePrefix - คำนำหน้าชื่อไฟล์ (เช่น 'รายงานความพึงพอใจ')
   */
  const runExport = async ({ functionName, startDate, endDate, filePrefix }) => {
    const startObj = new Date(startDate);
    const endObj = new Date(endDate);
    
    // สร้างข้อความยืนยัน
    const startStr = formatDateThaiDisplay(startObj);
    const endStr = formatDateThaiDisplay(endObj);
    
    const confirmResult = await Swal.fire({
      title: "ยืนยันการดาวน์โหลด?",
      html: `
        ต้องการดาวน์โหลด${filePrefix} <br/>
        <b class="text-indigo-600 dark:text-indigo-400">${startStr}</b> ถึง <b class="text-indigo-600 dark:text-indigo-400">${endStr}</b> <br/>
        ใช่หรือไม่?
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "ใช่, ดาวน์โหลด",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#10b981",
    });

    if (!confirmResult.isConfirmed) return;

    isExporting.value = true;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("ไม่พบ Session ผู้ใช้งาน กรุณา Login ใหม่");

      // เตรียม Payload (ส่งไปทั้ง 2 แบบเพื่อให้รองรับทั้ง 2 Function โดยไม่ต้องแก้ Backend)
      const payload = {
        startDate: startObj.toISOString(),
        endDate: endObj.toISOString(),
        start: startObj.toISOString(),
        end: endObj.toISOString()
      };

      // เรียก Edge Function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Export failed from server');
      }

      // สร้าง Blob และ Link ดาวน์โหลด
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // ตั้งชื่อไฟล์
      const fileName = `${filePrefix}_${formatDateThaiFull(startObj)}_ถึง_${formatDateThaiFull(endObj)}.xlsx`;
      link.setAttribute('download', fileName);

      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      // แจ้งเตือนสำเร็จ
      Swal.fire({
        icon: "success",
        title: "ดาวน์โหลดสำเร็จ",
        text: `ไฟล์ "${fileName}" ถูกบันทึกเรียบร้อยแล้ว`,
        showConfirmButton: true,
        confirmButtonText: "ปิดหน้าต่าง",
      });

    } catch (err) {
      console.error("Export Error:", err);
      Swal.fire("Error", `ดาวน์โหลดไม่สำเร็จ: ${err.message}`, "error");
    } finally {
      isExporting.value = false;
    }
  };

  return { isExporting, runExport };
}