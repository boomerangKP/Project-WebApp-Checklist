import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper แปลงวันที่ (คงเดิม)
const formatThaiDate = (isoString: string, type: 'date' | 'time' | 'full' = 'full') => {
  if (!isoString) return '-'
  const date = new Date(isoString)
  const thaiDate = new Date(date.getTime() + (7 * 60 * 60 * 1000))
  const d = String(thaiDate.getUTCDate()).padStart(2, '0')
  const m = String(thaiDate.getUTCMonth() + 1).padStart(2, '0')
  const y = thaiDate.getUTCFullYear() + 543
  const hr = String(thaiDate.getUTCHours()).padStart(2, '0')
  const min = String(thaiDate.getUTCMinutes()).padStart(2, '0')
  const sec = String(thaiDate.getUTCSeconds()).padStart(2, '0')
  const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]
  if (type === 'time') return `${hr}:${min}:${sec}`
  if (type === 'date') return `${d} ${months[m]} ${y}`
  return `${d} ${months[m]} ${y} ${hr}:${min}`
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

    const { startDate, endDate } = await req.json()

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

    // 1. ดึงหัวข้อ (ดึงเฉพาะที่ใช้)
    const { data: topicsData } = await supabaseAdmin.from('feedback_topics').select('id, name').order('id')
    const topicsMap = (topicsData || []).reduce((acc: any, curr: any) => { acc[curr.id] = curr.name; return acc }, {})
    const sortedTopicIds = Object.keys(topicsMap).sort((a, b) => Number(a) - Number(b))
    const topicNames = sortedTopicIds.map(id => topicsMap[id] || `หัวข้อ ${id}`)

    // 2. ดึงข้อมูล (Optimized Query)
    let query = supabaseAdmin
        .from('feedbacks')
        .select(`
            created_at, 
            rating, 
            answers, 
            comment,
            locations (locations_name, locations_building, locations_floor)
        `)
        .order('created_at', { ascending: true })
    
    if (startDate) query = query.gte('created_at', startDate)
    if (endDate) query = query.lte('created_at', endDate)
    
    const { data: feedbacks, error } = await query
    if (error) throw error

    // 3. เตรียมข้อมูล Data Rows
    const dataRows = (feedbacks || []).map((f: any) => {
      const row = [
        formatThaiDate(f.created_at, 'time'),
        formatThaiDate(f.created_at, 'date'),
        f.locations?.locations_name || '-',
        f.locations?.locations_building || '-',
        f.locations?.locations_floor || '-',
        f.rating || '-',
      ]
      sortedTopicIds.forEach(id => {
        let score = '-'
        if (f.answers && f.answers[id] !== undefined) {
           const ans = f.answers[id]
           score = (typeof ans === 'object' && ans !== null) ? String(ans.rating) : String(ans)
        }
        row.push(score)
      })
      row.push(f.comment || '-')
      return row
    })

    // 4. สร้างโครงสร้าง CSV (Mimic Table Structure)
    const topicCount = topicNames.length
    const dateRangeStr = `ข้อมูลตั้งแต่วันที่ ${formatThaiDate(startDate, 'date')} ถึง ${formatThaiDate(endDate, 'date')}`
    
    // สร้างส่วนหัวตารางให้คล้าย Excel เดิม (แต่ไม่มี Merge)
    // Row 3: Header หลัก
    // Row 4: Sub-Header (ชื่อหัวข้อประเมิน)
    const headerRow1 = ["ประทับเวลา", "วัน/เดือน/ปี", "สถานที่", "อาคาร", "ชั้น", "คะแนนเฉลี่ย", "คะแนนแต่ละหัวข้อประเมิน", ...Array(topicCount > 1 ? topicCount - 1 : 0).fill(""), "ข้อเสนอแนะ"]
    const headerRow2 = ["", "", "", "", "", "", ...topicNames, ""]

    const csvStructure = [
      ["รายงานคะแนนแบบประเมินความพึงพอใจการบริการด้านความสะอาด"],
      [dateRangeStr],
      headerRow1,
      headerRow2,
      ...dataRows
    ]

    // 5. แปลงเป็น CSV Text
    const csvContent = toCSV(csvStructure)
    
    // ส่งไฟล์กลับเป็น CSV
    return new Response(csvContent, { 
        headers: { 
            ...corsHeaders, 
            'Content-Type': 'text/csv; charset=utf-8', 
            'Content-Disposition': `attachment; filename="satisfaction_report.csv"` 
        } 
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})