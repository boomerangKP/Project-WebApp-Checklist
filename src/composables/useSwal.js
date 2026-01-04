// src/composables/useSwal.js
import Swal from 'sweetalert2'

// 1. ตั้งค่า Theme กลางที่นี่ที่เดียว (เปลี่ยนสี เปลี่ยนฟอนต์ แก้ที่นี่มีผลทั้งเว็บ)
const MySwal = Swal.mixin({
  customClass: {
    confirmButton: 'bg-[#38b6ff] text-white px-4 py-2 rounded-lg ml-2 hover:bg-[#38b6ff]/90 border-none shadow-sm',
    cancelButton: 'bg-gray-100 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-200 border-none shadow-sm',
    popup: 'font-noto rounded-2xl' // ใส่คลาส Tailwind หรือ Font ที่ต้องการ
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

  // 4. ฟังก์ชันถามยืนยัน (Confirm) - คืนค่าเป็น true/false
  const swalConfirm = async (title, text, confirmText = 'ยืนยัน', icon = 'question') => {
    const result = await MySwal.fire({
      title: title,
      text: text,
      icon: icon,
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: 'ยกเลิก',
      // ถ้าเป็นปุ่มลบ ให้เป็นสีแดง
      customClass: {
        confirmButton: icon === 'warning' 
          ? 'bg-red-600 text-white px-4 py-2 rounded-lg ml-2 hover:bg-red-700 border-none' 
          : 'bg-[#38b6ff] text-white px-4 py-2 rounded-lg ml-2 hover:bg-[#38b6ff]/90 border-none',
        cancelButton: 'bg-gray-100 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-200 border-none'
      }
    })
    return result.isConfirmed
  }

  return {
    swalSuccess,
    swalError,
    swalConfirm,
    Swal: MySwal // เผื่ออยากเรียกใช้ดิบๆ
  }
}