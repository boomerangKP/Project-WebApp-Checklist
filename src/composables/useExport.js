// src/composables/useExport.js
import { ref } from "vue";
import { supabase } from "@/lib/supabase";
import { useSwal } from "@/composables/useSwal";

export function useExport() {
  const { Swal } = useSwal();
  const isExporting = ref(false);

  // Helper Functions
  const formatDateThaiFull = (date) => {
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = d.toLocaleDateString("th-TH", { month: 'long' });
    const year = d.toLocaleDateString("th-TH", { year: 'numeric' });
    return `${day}-${month}-${year}`;
  };

  const formatDateThaiDisplay = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString("th-TH", { dateStyle: "long" });
  };

  /**
   * runExport - ฟังก์ชันครอบจักรวาลสำหรับ Export Excel
   * @param {Object} config
   * @param {string} config.functionName - ชื่อ Edge Function
   * @param {Date|string} config.startDate - วันเริ่ม
   * @param {Date|string} config.endDate - วันจบ
   * @param {string} config.filePrefix - คำนำหน้าชื่อไฟล์
   * @param {number} [config.maxMonths=6] - ✅ จำกัดจำนวนเดือนสูงสุด (default 6 เดือน)
   */
  const runExport = async ({ functionName, startDate, endDate, filePrefix, maxMonths = 6 }) => {
    try {
      // 1. แปลงเป็น Date Object
      const startObj = new Date(startDate);
      const endObj = new Date(endDate);

      // ✅ 2. Validation: ตรวจสอบระยะห่างเดือน
      // คำนวณวันสุดท้ายที่อนุญาต (Start Date + maxMonths)
      const maxAllowedDate = new Date(startObj);
      maxAllowedDate.setMonth(maxAllowedDate.getMonth() + maxMonths);

      // ถ้าวันที่สิ้นสุด เกินกว่าวันที่อนุญาต
      if (endObj > maxAllowedDate) {
        await Swal.fire({
          icon: "warning",
          title: "ช่วงเวลาเกินกำหนด",
          text: `ระบบอนุญาตให้ดาวน์โหลดข้อมูลได้สูงสุดครั้งละ ${maxMonths} เดือน เพื่อป้องกันข้อผิดพลาด`,
          confirmButtonText: "เข้าใจแล้ว",
        });
        return; // หยุดทำงานทันที
      }

      // 3. ยืนยันก่อนโหลด
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

      // 4. เริ่มดึงข้อมูล
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("ไม่พบ Session ผู้ใช้งาน กรุณา Login ใหม่");

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startDate: startObj.toISOString(),
          endDate: endObj.toISOString(),
          start: startObj.toISOString(), // ส่งเผื่อไปทั้ง 2 ชื่อ field
          end: endObj.toISOString()
        })
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Export failed from server');
      }

      // 5. จัดการไฟล์ Download
      // ✅ ตรวจสอบ Content-Type เพื่อหานามสกุลไฟล์ (CSV หรือ Excel)
      const contentType = response.headers.get('content-type');
      let extension = 'xlsx'; // ค่า Default เดิม
      
      // ถ้า Header ส่งมาว่าเป็น CSV ให้ใช้นามสกุล .csv
      if (contentType && contentType.includes('text/csv')) {
        extension = 'csv';
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // ✅ ตั้งชื่อไฟล์ตามนามสกุลที่ถูกต้อง
      const fileName = `${filePrefix}_${formatDateThaiFull(startObj)}_ถึง_${formatDateThaiFull(endObj)}.${extension}`;
      link.setAttribute('download', fileName);

      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      // 6. แจ้งเตือนสำเร็จ
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