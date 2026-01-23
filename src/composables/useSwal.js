// src/composables/useSwal.js
import Swal from 'sweetalert2'

// 1. ตั้งค่า Theme กลาง (กำหนดสีพื้นหลังและตัวอักษรตรงนี้)
const MySwal = Swal.mixin({
  customClass: {
    // ✅ แก้ไข: เพิ่ม bg-white (สว่าง) และ dark:bg-slate-800 (มืด)
    popup: 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-noto rounded-2xl border border-gray-200 dark:border-slate-700 shadow-xl',

    // ปุ่ม Confirm
    confirmButton: 'bg-[#38b6ff] text-white px-4 py-2 rounded-lg ml-2 hover:bg-[#38b6ff]/90 border-none shadow-sm',

    // ปุ่ม Cancel (เพิ่ม Dark Mode)
    cancelButton: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 border-none shadow-sm'
  },
  buttonsStyling: false,
  reverseButtons: true
})

export function useSwal() {

  // 2. ฟังก์ชันแจ้งเตือนสำเร็จ (Success)
  const swalSuccess = (title = 'ทำรายการสำเร็จ') => {
    return MySwal.fire({
      icon: 'success',
      title: title,
      showConfirmButton: false,
      timer: 1500,
      timerProgressBar: true
    })
  }

  // 3. ฟังก์ชันแจ้งเตือน Error
  const swalError = (title = 'เกิดข้อผิดพลาด', text = '') => {
    return MySwal.fire({
      icon: 'error',
      title: title,
      text: text,
      confirmButtonText: 'ตกลง'
    })
  }

  // 4. ฟังก์ชันถามยืนยัน (Confirm)
  const swalConfirm = async (title, text, confirmText = 'ยืนยัน', icon = 'question') => {
    const result = await MySwal.fire({
      title: title,
      text: text,
      icon: icon,
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: 'ยกเลิก',
      // Override customClass เฉพาะปุ่ม แต่ดึง popup มาจาก mixin (ถ้าเวอร์ชั่นใหม่ๆ จะ merge ให้)
      // แต่เพื่อความชัวร์ ใส่ popup ซ้ำไปก็ได้ครับถ้ามันยังเพี้ยน
      customClass: {
        popup: 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-noto rounded-2xl border border-gray-200 dark:border-slate-700 shadow-xl',

        confirmButton: icon === 'warning'
          ? 'bg-red-600 text-white px-4 py-2 rounded-lg ml-2 hover:bg-red-700 border-none'
          : 'bg-[#38b6ff] text-white px-4 py-2 rounded-lg ml-2 hover:bg-[#38b6ff]/90 border-none',

        cancelButton: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 border-none'
      }
    })
    return result.isConfirmed
  }

  return {
    swalSuccess,
    swalError,
    swalConfirm,
    Swal: MySwal
  }
}
