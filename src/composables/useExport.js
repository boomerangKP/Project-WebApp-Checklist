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
   * runExport - ฟังก์ชันครอบจักรวาลสำหรับ Export Excel / CSV
   * @param {Object} config
   * @param {string} config.functionName - ชื่อ Edge Function
   * @param {Date|string} config.startDate - วันเริ่ม
   * @param {Date|string} config.endDate - วันจบ
   * @param {string} config.filePrefix - คำนำหน้าชื่อไฟล์
   * @param {number} [config.maxMonths=6] - จำกัดจำนวนเดือนสูงสุด (default 6 เดือน)
   * @param {boolean} [config.showCloseRoundOption=false] - แสดง Checkbox ถามปิดรอบหรือไม่ (เฉพาะรายงานการทำงาน)
   */
  const runExport = async ({ 
    functionName, 
    startDate, 
    endDate, 
    filePrefix, 
    maxMonths = 6,
    showCloseRoundOption = false // ✅ เพิ่มตัวเลือกใหม่สำหรับแสดง Checkbox ปิดรอบ
  }) => {
    try {
      // 1. แปลงเป็น Date Object
      const startObj = new Date(startDate);
      const endObj = new Date(endDate);

      // 2. Validation: ตรวจสอบระยะห่างเดือน
      const maxAllowedDate = new Date(startObj);
      maxAllowedDate.setMonth(maxAllowedDate.getMonth() + maxMonths);

      // ถ้าวันที่สิ้นสุด เกินกว่าวันที่อนุญาต
      if (endObj > maxAllowedDate) {
        await Swal.fire({
          icon: "warning",
          title: "ช่วงเวลาเกินกำหนด",
          text: `ระบบอนุญาตให้ดาวน์โหลดข้อมูลได้สูงสุดครั้งละ ${maxMonths} เดือน เพื่อป้องกันข้อผิดพลาดและโหลดหนักเกินไป`,
          confirmButtonText: "เข้าใจแล้ว",
          confirmButtonColor: "#4f46e5",
        });
        return; // หยุดทำงานทันที
      }

      // 3. ยืนยันก่อนโหลด (รองรับระบบปิดรอบ)
      const startStr = formatDateThaiDisplay(startObj);
      const endStr = formatDateThaiDisplay(endObj);

      // HTML พื้นฐานสำหรับแจ้งเตือน
      let alertHtml = `
        <div class="text-sm text-gray-600 mb-4 text-left">
          ต้องการดาวน์โหลด <b>${filePrefix}</b><br/>
          ตั้งแต่วันที่ <span class="font-bold text-indigo-600">${startStr}</span> ถึง <span class="font-bold text-indigo-600">${endStr}</span><br/>
          ใช่หรือไม่?
        </div>
      `;

      // ✅ ถ้าอนุญาตให้โชว์ตัวเลือกปิดรอบได้ ให้แทรก HTML ของ Checkbox เข้าไป
      if (showCloseRoundOption) {
        alertHtml += `
          <div class="bg-red-50 border border-red-100 p-3 rounded-lg flex items-start gap-3 text-left mt-4 animate-in fade-in zoom-in-95">
            <div class="flex items-center h-5 mt-0.5">
              <input id="swal-close-round" type="checkbox" class="w-4 h-4 text-red-600 bg-white border-red-300 rounded focus:ring-red-500 cursor-pointer transition-colors">
            </div>
            <label for="swal-close-round" class="text-xs sm:text-sm text-red-800 cursor-pointer">
              <strong class="block mb-0.5">ปิดรอบการตรวจและสำรองข้อมูล (Close Cycle)</strong>
              หากเลือก ระบบจะแปลงข้อมูลเป็น <span class="font-bold">ไฟล์ CSV เก็บไว้ในเซิร์ฟเวอร์</span> และ <span class="font-bold underline">ลบข้อมูลเดิมทิ้ง</span> เพื่อเตรียมเริ่มรอบใหม่
            </label>
          </div>
        `;
      }

      const confirmResult = await Swal.fire({
        title: "ยืนยันการดาวน์โหลด",
        html: alertHtml,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "ดำเนินการดาวน์โหลด",
        cancelButtonText: "ยกเลิก",
        confirmButtonColor: "#10b981",
        cancelButtonColor: "#94a3b8",
        // 🚨 แก้ไขตรงนี้: คืนค่าเป็น Object เสมอ เพื่อป้องกัน SweetAlert ค้าง
        preConfirm: () => {
          let checked = false;
          if (showCloseRoundOption) {
            const checkbox = document.getElementById('swal-close-round');
            if (checkbox) {
              checked = checkbox.checked;
            }
          }
          return { isClosing: checked };
        }
      });

      // ถ้ายกเลิก ให้หยุดการทำงาน
      if (!confirmResult.isConfirmed) return;

      // 🚨 แก้ไขตรงนี้: ดึงค่าจาก Object ที่ส่งมาจาก preConfirm
      const isClosingRound = confirmResult.value?.isClosing || false; 
      
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
          end: endObj.toISOString(),
          isClosingRound: isClosingRound // ✅ ส่งค่าให้หลังบ้านรู้ว่าต้องปิดรอบไหม
        })
      });

      if (!response.ok) {
        // พยายามอ่านข้อความ Error จาก Backend
        let errorText = 'ดาวน์โหลดล้มเหลวจากเซิร์ฟเวอร์';
        try {
          const errJson = await response.json();
          if (errJson.error) errorText = errJson.error;
        } catch (e) {
          errorText = `Server returned status ${response.status}`;
        }
        throw new Error(errorText);
      }

      // 5. จัดการไฟล์ Download
      const contentType = response.headers.get('content-type');
      let extension = 'xlsx'; // ค่า Default เดิม
      
      // ถ้า Header ส่งมาว่าเป็น CSV ให้ใช้นามสกุล .csv
      if (contentType && contentType.includes('text/csv')) {
        extension = 'csv';
      }

      // ป้องกันเรื่องชื่อไฟล์
      const safePrefix = filePrefix.replace(/\s+/g, '_');
      const fileName = `${safePrefix}_${formatDateThaiFull(startObj)}_ถึง_${formatDateThaiFull(endObj)}.${extension}`;

      // อ่าน Data เป็น Blob แล้วดาวน์โหลด
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);

      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      // 6. แจ้งเตือนสำเร็จ
      // เปลี่ยนข้อความแจ้งเตือนถ้ามีการปิดรอบด้วย
      const successTitle = isClosingRound ? "ดาวน์โหลดและปิดรอบสำเร็จ" : "ดาวน์โหลดสำเร็จ";
      const successText = isClosingRound 
        ? `ไฟล์ "${fileName}" ถูกบันทึกเรียบร้อย และระบบได้ทำการปิดรอบพร้อมสำรองข้อมูลแล้ว`
        : `ไฟล์ "${fileName}" ถูกบันทึกเรียบร้อยแล้ว`;

      Swal.fire({
        icon: "success",
        title: successTitle,
        text: successText,
        showConfirmButton: true,
        confirmButtonText: "รับทราบ",
        confirmButtonColor: "#4f46e5",
      });

    } catch (err) {
      console.error("Export Error:", err);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: `ดาวน์โหลดไม่สำเร็จ: ${err.message}`,
        confirmButtonColor: "#ef4444"
      });
    } finally {
      isExporting.value = false;
    }
  };

  return { isExporting, runExport };
}