import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import * as XLSX from "https://esm.sh/xlsx@0.18.5"

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
  const map: Record<string, string> = {
    pass: "รอตรวจ",
    approved: "ตรวจแล้ว",
    fixed: "แก้ไขแล้ว",
    fail: "พบปัญหา",
    rejected: "ปฏิเสธ",
    waiting: "รอตรวจ",
  }
  return map[status] || status
}

const getRoleName = (role: string) => {
  const map: Record<string, string> = {
    admin: 'ผู้ดูแลระบบ',
    supervisor: 'หัวหน้างาน',
    user: 'พนักงานทั่วไป',
    maid: 'แม่บ้าน',
    cleaner: 'พนักงานทำความสะอาด'
  }
  return map[role] || role || '-'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // 🛡️ 1. SECURITY CHECK: ตรวจสอบว่ามี Token ส่งมาไหม
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    const { start, end } = await req.json()
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 🛡️ 2. SECURITY CHECK: ตรวจสอบความถูกต้องของ User
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized: กรุณาเข้าสู่ระบบ' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // --- เริ่มดึงข้อมูล (เหมือนเดิม) ---

    // 1. Query
    const { data: rawLogs, error } = await supabaseAdmin
      .from('check_sessions')
      .select(`
        *,
        employees:employees!check_sessions_employees_id_fkey (
            employees_firstname,
            employees_lastname
        ),
        locations (
            locations_id,
            locations_name,
            locations_building,
            locations_floor
        ),
        time_slots (
            time_slots_start
        ),
        inspector:employees!check_sessions_checked_by_fkey (
            employees_firstname,
            employees_lastname,
            role
        )
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
        const groupKey = `${log.check_sessions_date}_${log.locations_id}_${shiftKey}`

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

        processedRows.push({
            id: log.check_sessions_id,
            dateRaw: log.check_sessions_date,
            createdAtRaw: createdAt.getTime(),
            buildingRaw: log.locations?.locations_building || '-',
            floorRaw: Number(log.locations?.locations_floor) || 0,
            
            date: formatThaiDate(log.check_sessions_date, 'date'),
            empName: `${log.employees?.employees_firstname || ''} ${log.employees?.employees_lastname || ''}`.trim(),
            building: log.locations?.locations_building || '-',
            floor: log.locations?.locations_floor || '-',
            location: log.locations?.locations_name || '-',
            round: roundTracker[groupKey],
            timestamp: formatThaiDate(log.created_at, 'time'),
            shift: isMorning ? 'เช้า' : 'บ่าย',
            status: translateStatus(log.check_sessions_status),
            checkDate: checkDateStr,
            checkTime: checkTimeStr,
            inspector: inspectorName,
            inspectorRole: inspectorRole,
            remark: log.supervisor_comment || ''
        })
    })

    processedRows.sort((a, b) => {
        if (a.dateRaw !== b.dateRaw) return a.dateRaw.localeCompare(b.dateRaw)
        if (a.buildingRaw !== b.buildingRaw) return a.buildingRaw.localeCompare(b.buildingRaw)
        if (a.floorRaw !== b.floorRaw) return a.floorRaw - b.floorRaw
        return a.createdAtRaw - b.createdAtRaw
    })

    // 3. Create Excel Structure
    const startDateTh = formatThaiDate(start, 'date')
    const endDateTh = formatThaiDate(end, 'date')
    
    // Headers
    const ws_data = [
        [`รายงานสรุปการทำความสะอาด (Maid Report)`],
        [`ช่วงวันที่: ${startDateTh} ถึง ${endDateTh}`],
        [
            "ลำดับ", "รหัสงาน", "วัน/เดือน/ปี", "ชื่อพนักงาน", "อาคาร", "ชั้น", "ชื่อจุดตรวจ",
            "ข้อมูลงานทำความสะอาด", "", "",
            "ข้อมูลติดตามงาน", "", "", "", "", "หมายเหตุ"
        ],
        [
            "", "", "", "", "", "", "",
            "ครั้งที่", "ประทับเวลา", "ช่วงการทำงาน",
            "สถานะ", "วัน/เดือน/ปี", "เวลา", "ชื่อผู้ตรวจ", "ตำแหน่ง", ""
        ]
    ]

    // Rows
    const dataOnly = processedRows.map((r, i) => [
        i + 1,
        r.id,
        r.date,
        r.empName,
        r.building,
        r.floor,
        r.location,
        r.round,
        r.timestamp,
        r.shift,
        r.status,
        r.checkDate,
        r.checkTime,
        r.inspector,
        r.inspectorRole,
        r.remark
    ])

    // ✅ Combine Headers + Data
    const finalData = [...ws_data, ...dataOnly]

    // 4. Generate Worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(finalData)

    // 5. Apply Merges
    worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 15 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 15 } },
        { s: { r: 2, c: 0 }, e: { r: 3, c: 0 } },
        { s: { r: 2, c: 1 }, e: { r: 3, c: 1 } },
        { s: { r: 2, c: 2 }, e: { r: 3, c: 2 } },
        { s: { r: 2, c: 3 }, e: { r: 3, c: 3 } },
        { s: { r: 2, c: 4 }, e: { r: 3, c: 4 } },
        { s: { r: 2, c: 5 }, e: { r: 3, c: 5 } },
        { s: { r: 2, c: 6 }, e: { r: 3, c: 6 } },
        { s: { r: 2, c: 7 }, e: { r: 2, c: 9 } },
        { s: { r: 2, c: 10 }, e: { r: 2, c: 14 } },
        { s: { r: 2, c: 15 }, e: { r: 3, c: 15 } }
    ]

    // 6. Set Column Widths
    worksheet['!cols'] = [
        { wch: 6 }, { wch: 8 }, { wch: 12 }, { wch: 20 }, { wch: 6 }, { wch: 5 }, { wch: 20 },
        { wch: 6 }, { wch: 10 }, { wch: 10 },
        { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 20 }, { wch: 15 }, { wch: 20 }
    ]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Maid Report")
    
    const fileBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })

    return new Response(fileBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Work_Report_${start}_${end}.xlsx"`
      }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})