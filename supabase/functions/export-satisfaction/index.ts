import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper แปลงวันที่ (แก้ไข Bug การ return ค่า)
const formatThaiDate = (isoString: string, type: 'date' | 'time' | 'full' = 'full') => {
  if (!isoString) return '-'
  const date = new Date(isoString)
  const thaiDate = new Date(date.getTime() + (7 * 60 * 60 * 1000))
  const d = String(thaiDate.getUTCDate()).padStart(2, '0')
  const m = thaiDate.getUTCMonth() // เริ่ม 0-11
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

    // ✅ เพิ่มการรับค่า isClosingRound
    const { startDate, endDate, isClosingRound } = await req.json()

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
            id,
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

    // เก็บ IDs สำหรับการลบถ้ามีการปิดรอบ
    const feedbackIdsToDelete: number[] = []

    // 3. เตรียมข้อมูล Data Rows
    const dataRows = (feedbacks || []).map((f: any) => {
      feedbackIdsToDelete.push(f.id) // เก็บ ID ไว้ใช้ลบ

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

    // ✅ 6. จัดการกระบวนการปิดรอบ (Backup & Purge Data)
    if (isClosingRound && feedbackIdsToDelete.length > 0) {
      console.log(`[Close Cycle] เริ่มต้นกระบวนการปิดรอบ สำรองข้อมูลจำนวน ${feedbackIdsToDelete.length} รายการ`)
      
      const timestamp = new Date().getTime();
      const safeStart = startDate.split('T')[0];
      const safeEnd = endDate.split('T')[0];
      const backupFileName = `backup_satisfaction_${safeStart}_to_${safeEnd}_${timestamp}.csv`

      // 6.1 อัปโหลดเป็น Backup ไปที่ Storage (ถัง archives)
      const { error: uploadError } = await supabaseAdmin.storage
        .from('archives')
        .upload(backupFileName, csvContent, {
          contentType: 'text/csv; charset=utf-8',
          upsert: false
        })

      if (uploadError) {
        console.error("Backup Failed:", uploadError)
        throw new Error(`ไม่สามารถสำรองข้อมูลได้ กรุณาลองใหม่ (${uploadError.message})`)
      }

      console.log(`[Close Cycle] สำรองไฟล์สำเร็จ: ${backupFileName}`)

      // 6.2 ทำการลบข้อมูลใน Database ด้วยเทคนิค Chunking (ทีละ 1000 แถว)
      const BATCH_SIZE = 1000;
      for (let i = 0; i < feedbackIdsToDelete.length; i += BATCH_SIZE) {
        const batchIds = feedbackIdsToDelete.slice(i, i + BATCH_SIZE);

        const { error: delError } = await supabaseAdmin
          .from('feedbacks')
          .delete()
          .in('id', batchIds)
        
        if (delError) {
          console.error("Delete feedbacks Failed:", delError)
          throw new Error(`ลบข้อมูลรายงานความพึงพอใจไม่สำเร็จ: ${delError.message}`)
        }
      }
      
      console.log(`[Close Cycle] ลบข้อมูลเสร็จสมบูรณ์ ปิดรอบสำเร็จ`)
    }
    
    // 7. ส่งไฟล์กลับเป็น CSV
    return new Response(csvContent, { 
        headers: { 
            ...corsHeaders, 
            'Content-Type': 'text/csv; charset=utf-8', 
            'Content-Disposition': `attachment; filename="satisfaction_report.csv"` 
        } 
    })

  } catch (error) {
    console.error("Function Error:", error)
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})