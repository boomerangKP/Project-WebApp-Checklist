import { supabase } from '@/lib/supabase'
import dayjs from 'dayjs'
import 'dayjs/locale/th'

export function useJobChecks() {
  
  // 1. ฟังก์ชันหา Slot เวลาปัจจุบัน จากตาราง time_slots
  const getCurrentTimeSlot = async () => {
    const now = dayjs().format('HH:mm:ss') // จะได้รูปแบบ "14:30:00" ตรงกับ Database
    
    const { data } = await supabase
      .from('time_slots')
      .select('*')
      .lte('time_slots_start', now) // เวลาเริ่ม ต้องน้อยกว่าหรือเท่ากับ ปัจจุบัน
      .gt('time_slots_end', now)    // เวลาจบ ต้องมากกว่า ปัจจุบัน
      .single()
      
    return data
  }

  // 2. ฟังก์ชันเช็คงานซ้ำ (Core Logic)
  const checkExistingSession = async (locationId) => {
    const currentSlot = await getCurrentTimeSlot()
    
    // ✅ Logic เวลา:
    // - ถ้าเจอ Slot ใน DB: ใช้เวลาเริ่มของ Slot นั้น (เช่น "07:00:00") เป็นตัวเช็ค
    // - ถ้าไม่เจอ (นอกเวลา): ใช้ "ต้นชั่วโมง" ปัจจุบัน (เช่น "19:00:00") เป็นตัวเช็ค เพื่อกัน Spam
    const slotStartTime = currentSlot 
      ? currentSlot.time_slots_start 
      : dayjs().startOf('hour').format('HH:mm:ss')

    const todayStr = dayjs().format('YYYY-MM-DD')

    // Query หาว่าใน "วันและรอบเวลานี้" มีการส่งงานหรือยัง
    const { data } = await supabase
      .from('check_sessions')
      .select(`
        check_sessions_id,
        check_sessions_status,
        created_at,
        edit_count,
        employees_id,
        check_sessions_time_start,
        employees:employees!check_sessions_employees_id_fkey (
          employees_firstname,
          employees_lastname
        )
      `)
      .eq('locations_id', locationId)
      .eq('check_sessions_date', todayStr)
      .eq('check_sessions_time_start', slotStartTime) // ✅ เช็คเจาะจงรอบเวลา
      .maybeSingle()

    return { 
      existingSession: data, 
      currentSlot,           
      slotStartTime,         
      todayStr               
    }
  }

  return {
    getCurrentTimeSlot,
    checkExistingSession
  }
}