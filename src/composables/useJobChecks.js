import { supabase } from '@/lib/supabase'
import dayjs from 'dayjs'
import 'dayjs/locale/th'

export function useJobChecks() {
  
  // 1. ฟังก์ชันหา Slot เวลาปัจจุบัน
  const getCurrentTimeSlot = async () => {
    const now = dayjs().format('HH:mm:ss')
    const { data } = await supabase
      .from('time_slots')
      .select('*')
      .lte('time_slots_start', now)
      .gt('time_slots_end', now)
      .single()
    return data
  }

  // 2. ฟังก์ชันเช็คงานซ้ำ (Core Logic)
  // คืนค่าทั้งข้อมูลงานที่ซ้ำ และข้อมูลเวลาที่ใช้เช็ค
  const checkExistingSession = async (locationId) => {
    const currentSlot = await getCurrentTimeSlot()
    
    // ถ้าไม่มี Slot (นอกเวลา) ให้ใช้เวลาปัจจุบันเป็นตัวตั้ง
    const slotStartTime = currentSlot ? currentSlot.time_slots_start : dayjs().format('HH:mm:ss')
    const todayStr = dayjs().format('YYYY-MM-DD')

    // Query ไปยัง Database
    // ✅ จุดสำคัญ: ระบุ FK Constraint ชัดเจน (!check_sessions_employees_id_fkey) เพื่อไม่ให้ Supabase งง
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
      .eq('check_sessions_time_start', slotStartTime)
      .maybeSingle()

    return { 
      existingSession: data, // ข้อมูลงานที่เจอ (หรือ null ถ้าไม่เจอ)
      currentSlot,           // ข้อมูล Slot ปัจจุบัน
      slotStartTime,         // เวลาเริ่มงานของ Slot นี้ (เอาไปใช้ตอน Insert)
      todayStr               // วันที่ (เอาไปใช้ตอน Insert)
    }
  }

  return {
    getCurrentTimeSlot,
    checkExistingSession
  }
}