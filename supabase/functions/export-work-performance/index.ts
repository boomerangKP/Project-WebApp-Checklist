import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- Helpers ---
const formatThaiDate = (isoString: string, type: 'date' | 'time' | 'full' = 'full') => {
  if (!isoString) return '-'
  const date = new Date(isoString)
  const thaiDate = new Date(date.getTime() + (7 * 60 * 60 * 1000))
  const d = String(thaiDate.getUTCDate()).padStart(2, '0')
  const m = String(thaiDate.getUTCMonth() + 1).padStart(2, '0')
  const y = thaiDate.getUTCFullYear() + 543
  const hr = String(thaiDate.getUTCHours()).padStart(2, '0')
  const min = String(thaiDate.getUTCMinutes()).padStart(2, '0')
  if (type === 'time') return `${hr}:${min}`
  if (type === 'date') return `${d}/${m}/${y}`
  return `${d}/${m}/${y} ${hr}:${min}`
}

const translateStatus = (status: string) => {
  const map: Record<string, string> = { pass: "รอตรวจ", approved: "ตรวจแล้ว", fixed: "แก้ไขแล้ว", fail: "พบปัญหา", rejected: "ปฏิเสธ", waiting: "รอตรวจ" }
  return map[status] || status
}

const getRoleName = (role: string) => {
  const map: Record<string, string> = { admin: 'ผู้ดูแลระบบ', supervisor: 'หัวหน้างาน', user: 'พนักงานทั่วไป', maid: 'แม่บ้าน', cleaner: 'พนักงานทำความสะอาด' }
  return map[role] || role || '-'
}

// ✅ Helper สร้าง CSV String (รองรับภาษาไทย)
const toCSV = (rows: any[]) => {
  const escape = (val: any) => {
    if (val === null || val === undefined) return ''
    const str = String(val)
    // ถ้ามี , " หรือ ขึ้นบรรทัดใหม่ ให้ใส่ " ครอบ และ escape " เป็น ""
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }
  // \uFEFF คือ BOM เพื่อให้ Excel เปิดแล้วอ่านภาษาไทยออก
  return "\uFEFF" + rows.map(row => row.map(escape).join(',')).join('\n')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')

    const { start, end } = await req.json()
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Security Check
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 1. Query (Optimized)
    const { data: rawLogs, error } = await supabaseAdmin
      .from('check_sessions')
      .select(`
        check_sessions_id,
        check_sessions_date,
        check_sessions_status,
        supervisor_comment,
        created_at,
        updated_at,
        employees:employees!check_sessions_employees_id_fkey (employees_firstname, employees_lastname),
        locations (locations_name, locations_building, locations_floor),
        time_slots (time_slots_start),
        inspector:employees!check_sessions_checked_by_fkey (employees_firstname, employees_lastname, role)
      `)
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: true })

    if (error) throw error
    if (!rawLogs || rawLogs.length === 0) {
        throw new Error("ไม่พบข้อมูลในช่วงเวลาที่เลือก")
    }

    // 2. Process Data
    const roundTracker: Record<string, number> = {}
    const processedRows: any[] = []

    rawLogs.forEach((log: any) => {
        let isMorning = true
        const createdAt = new Date(log.created_at)
        const thaiHour = new Date(createdAt.getTime() + (7 * 60 * 60 * 1000)).getUTCHours()

        if (log.time_slots && log.time_slots.time_slots_start) {
            const startH = parseInt(log.time_slots.time_slots_start.split(':')[0])
            isMorning = startH < 12
        } else {
            isMorning = thaiHour < 12
        }

        const shiftKey = isMorning ? 'M' : 'A'
        const locId = log.locations?.locations_id || 'unk'
        const groupKey = `${log.check_sessions_date}_${locId}_${shiftKey}`

        if (!roundTracker[groupKey]) roundTracker[groupKey] = 0
        roundTracker[groupKey]++

        let inspectorName = ""
        let inspectorRole = ""
        let checkDateStr = ""
        let checkTimeStr = ""

        if (['approved', 'rejected', 'fixed'].includes(log.check_sessions_status)) {
            const updateAt = log.updated_at || log.created_at
            checkDateStr = formatThaiDate(updateAt, 'date')
            checkTimeStr = formatThaiDate(updateAt, 'time')

            if (log.inspector) {
                inspectorName = `${log.inspector.employees_firstname} ${log.inspector.employees_lastname}`
                inspectorRole = getRoleName(log.inspector.role)
            } else if (log.check_sessions_status === 'approved') {
                inspectorName = 'Admin (System)'
                inspectorRole = 'ผู้ดูแลระบบ'
            }
        }

        processedRows.push([
            processedRows.length + 1, // ลำดับ
            log.check_sessions_id,
            formatThaiDate(log.check_sessions_date, 'date'),
            `${log.employees?.employees_firstname || ''} ${log.employees?.employees_lastname || ''}`.trim(),
            log.locations?.locations_building || '-',
            log.locations?.locations_floor || '-',
            log.locations?.locations_name || '-',
            roundTracker[groupKey], // ครั้งที่
            formatThaiDate(log.created_at, 'time'),
            isMorning ? 'เช้า' : 'บ่าย',
            translateStatus(log.check_sessions_status),
            checkDateStr,
            checkTimeStr,
            inspectorName,
            inspectorRole,
            log.supervisor_comment || ''
        ])
    })

    // 3. Create CSV (Structure preserved)
    const startDateTh = formatThaiDate(start, 'date')
    const endDateTh = formatThaiDate(end, 'date')
    
    // ✅ โครงสร้าง Header แบบเดิม (แต่ใน CSV จะไม่มีการ Merge)
    // บรรทัดที่ 1-2: Title
    // บรรทัดที่ 3: Header หลัก (เว้นว่างไว้ตรงที่เคย Merge)
    // บรรทัดที่ 4: Sub-Header
    const headersStructure = [
        [`รายงานสรุปการทำความสะอาด (Maid Report)`],
        [`ช่วงวันที่: ${startDateTh} ถึง ${endDateTh}`],
        // Header Row 1 (Main Categories)
        ["ลำดับ", "รหัสงาน", "วัน/เดือน/ปี", "ชื่อพนักงาน", "อาคาร", "ชั้น", "ชื่อจุดตรวจ", "ข้อมูลงานทำความสะอาด", "", "", "ข้อมูลติดตามงาน", "", "", "", "", "หมายเหตุ"],
        // Header Row 2 (Sub Categories) - ตรงไหนที่เป็นช่องว่างใน Row 1 จะมาโผล่ตรงนี้แทน
        ["", "", "", "", "", "", "", "ครั้งที่", "ประทับเวลา", "ช่วงการทำงาน", "สถานะ", "วัน/เดือน/ปี", "เวลา", "ชื่อผู้ตรวจ", "ตำแหน่ง", ""]
    ]

    // รวม Header + Data
    const finalData = [...headersStructure, ...processedRows]
    
    // แปลงเป็น CSV Text
    const csvContent = toCSV(finalData)

    return new Response(csvContent, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/csv; charset=utf-8', 
        'Content-Disposition': `attachment; filename="Work_Report_${start}_${end}.csv"` 
      }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})