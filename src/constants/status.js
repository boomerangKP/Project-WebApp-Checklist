// src/constants/status.js

export const TASK_STATUS = {
  // สถานะหลักที่ใช้ใน Tab
  WAITING: 'waiting',
  APPROVED: 'approved',
  REJECTED: 'rejected',

  // กลุ่มสถานะ (สำหรับ Query Database)
  // approved = ตรวจแล้วผ่าน (รวม pass, fixed)
  GROUP_APPROVED: ['approved', 'pass', 'fixed'],
  // rejected = ตรวจแล้วไม่ผ่าน (รวม fail)
  GROUP_REJECTED: ['rejected', 'fail']
}