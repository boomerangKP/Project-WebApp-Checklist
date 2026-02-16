// supabase/functions/delete-employee/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // จัดการ CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. ตรวจสอบว่ามี Header ส่งมาไหม
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    // 🛡️ 2. SECURITY CHECK (ฉบับปรับปรุง)
    // สร้าง Client ตัวแทนของ User คนนั้น (ใช้ Anon Key + Token ที่ส่งมา)
    // วิธีนี้ชัวร์กว่าการใช้ Admin Client ไปเช็ค Token เอง
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // ถาม Supabase ว่า "User คนนี้เป็นใคร"
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      console.error('Auth Check Failed:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Session invalid or expired' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // --- ผ่านการตรวจสอบแล้ว เริ่มทำงาน ---

    const { userId } = await req.json()
    if (!userId) throw new Error("User ID is required")

    // สร้าง Admin Client เพื่อสั่งลบ (ต้องใช้ Service Role เพราะ User ธรรมดาลบคนอื่นไม่ได้)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // สั่งลบ User ออกจาก Auth (ถาวร)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (error) throw error

    return new Response(
      JSON.stringify({ message: 'Deleted successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )

  } catch (error) {
    console.error('Delete Function Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})