import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import * as XLSX from "https://esm.sh/xlsx@0.18.5"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper แปลงวันที่ (คงเดิม)
const formatThaiDate = (isoString: string, type: 'date' | 'time' | 'full' = 'full') => {
  if (!isoString) return '-'
  const date = new Date(isoString)
  const thaiDate = new Date(date.getTime() + (7 * 60 * 60 * 1000))
  const d = thaiDate.getUTCDate()
  const m = thaiDate.getUTCMonth()
  const y = thaiDate.getUTCFullYear() + 543
  const hr = String(thaiDate.getUTCHours()).padStart(2, '0')
  const min = String(thaiDate.getUTCMinutes()).padStart(2, '0')
  const sec = String(thaiDate.getUTCSeconds()).padStart(2, '0')
  const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]
  if (type === 'time') return `${hr}:${min}:${sec}`
  if (type === 'date') return `${d} ${months[m]} ${y}`
  return `${d} ${months[m]} ${y} ${hr}:${min}`
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

    // 2. ดึงข้อมูล (⚡ Optimized Query: ระบุ Field แทน *)
    let query = supabaseAdmin
        .from('feedbacks')
        .select(`
            created_at, 
            rating, 
            answers, 
            comment,
            locations (locations_name, locations_building, locations_floor)
        `) // ✅ ดึงแค่นี้พอ เร็วขึ้นมาก
        .order('created_at', { ascending: true })
    
    if (startDate) query = query.gte('created_at', startDate)
    if (endDate) query = query.lte('created_at', endDate)
    
    const { data: feedbacks, error } = await query
    if (error) throw error

    // 3. เตรียมข้อมูล
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

    // 4. สร้าง Excel
    const topicCount = topicNames.length
    const dateRangeStr = `ข้อมูลตั้งแต่วันที่ ${formatThaiDate(startDate, 'date')} ถึง ${formatThaiDate(endDate, 'date')}`
    
    const ws_data = [
      ["รายงานคะแนนแบบประเมินความพึงพอใจการบริการด้านความสะอาด"],
      [dateRangeStr],
      ["ประทับเวลา", "วัน/เดือน/ปี", "สถานที่", "อาคาร", "ชั้น", "คะแนน\nเฉลี่ย", "คะแนนแต่ละหัวข้อประเมิน", ...Array(topicCount > 1 ? topicCount - 1 : 0).fill(""), "ข้อเสนอแนะ"],
      ["", "", "", "", "", "", ...topicNames, ""]
    ]

    const finalData = [...ws_data, ...dataRows]
    const worksheet = XLSX.utils.aoa_to_sheet(finalData)
    
    const lastColIndex = 6 + topicCount
    worksheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: lastColIndex } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: lastColIndex } },
      { s: { r: 2, c: 6 }, e: { r: 2, c: 5 + topicCount } },
      { s: { r: 2, c: 0 }, e: { r: 3, c: 0 } },
      { s: { r: 2, c: 1 }, e: { r: 3, c: 1 } },
      { s: { r: 2, c: 2 }, e: { r: 3, c: 2 } },
      { s: { r: 2, c: 3 }, e: { r: 3, c: 3 } },
      { s: { r: 2, c: 4 }, e: { r: 3, c: 4 } },
      { s: { r: 2, c: 5 }, e: { r: 3, c: 5 } },
      { s: { r: 2, c: lastColIndex }, e: { r: 3, c: lastColIndex } }
    ]
    worksheet['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, ...Array(topicCount).fill({ wch: 15 }), { wch: 45 }]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Feedback Report")

    // 5. ส่งไฟล์ (⚡ ปิด Compression เพื่อความเร็วสูงสุด)
    const fileBuffer = XLSX.write(workbook, { 
        type: "buffer", 
        bookType: "xlsx", 
        compression: false // ✅ จุดสำคัญ! ปิดการบีบอัดเพื่อให้เร็วขึ้น
    })
    
    return new Response(fileBuffer, { headers: { ...corsHeaders, 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="satisfaction_report.xlsx"` } })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})