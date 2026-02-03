import { supabase } from '@/lib/supabase'
import dayjs from 'dayjs'
import 'dayjs/locale/th'
import { useTaskFilterStore } from '@/stores/taskFilters' // ✅ 1. Import Store

export function useJobChecks() {
  const filterStore = useTaskFilterStore() // ✅ 2. เรียกใช้ Store

  // 1. ฟังก์ชันหา Slot เวลาปัจจุบัน (Cache Version: เร็วขึ้นเพราะไม่ยิง DB)
  const getCurrentTimeSlot = async () => {
    // ถ้ายังไม่มีข้อมูลใน Store ให้ไปโหลดมาก่อน (ทำครั้งเดียว)
    if (filterStore.timeSlots.length === 0) {
        await filterStore.fetchMasterData()
    }

    const now = dayjs().format('HH:mm:ss')
    
    // ✅ หาจากข้อมูลใน Memory แทนการยิง Database
    // เงื่อนไข: เวลาเริ่ม <= ปัจจุบัน และ เวลาจบ > ปัจจุบัน
    const foundSlot = filterStore.timeSlots.find(slot => 
        slot.time_slots_start <= now && slot.time_slots_end > now
    )
      
    return foundSlot || null // ถ้าไม่เจอคืน null (นอกเวลาทำการ)
  }

  // 2. ฟังก์ชันเช็คงานซ้ำ (Core Logic)
  const checkExistingSession = async (locationId) => {
    const currentSlot = await getCurrentTimeSlot()
    
    // ✅ Logic เวลา:
    // - ถ้าเจอ Slot: ใช้เวลาเริ่มของ Slot นั้น (เช่น "07:00:00")
    // - ถ้าไม่เจอ (นอกเวลา): ใช้ "ต้นชั่วโมง" ปัจจุบัน (เช่น "19:00:00")
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