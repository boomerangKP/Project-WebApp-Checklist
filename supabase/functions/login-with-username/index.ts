// supabase/functions/login-with-username/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // 1. จัดการ CORS สำหรับ Preflight Request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { username, password } = await req.json()
    
    // 2. ตรวจสอบว่ากรอกข้อมูลครบไหม (ส่งกลับเป็น 200 พร้อมข้อความ Error ภาษาไทย)
    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // สร้าง Supabase Client (สิทธิ์ Admin สำหรับค้นหาข้อมูลผู้ใช้)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // --------------------------------------------------------------------------
    // STEP 1: ลองค้นหาจาก "รหัสพนักงาน" ก่อน (แม่นยำที่สุด)
    // --------------------------------------------------------------------------
    let { data: users, error: findError } = await supabaseAdmin
      .from('employees')
      .select('email, employees_firstname, employees_code')
      .eq('employees_code', username)
    
    // --------------------------------------------------------------------------
    // STEP 2: ถ้าไม่เจอรหัสพนักงาน ให้ลองค้นหาจาก "ชื่อจริง" (Firstname)
    // --------------------------------------------------------------------------
    if (!users || users.length === 0) {
      const { data: usersByName } = await supabaseAdmin
        .from('employees')
        .select('email, employees_firstname, employees_code')
        .ilike('employees_firstname', username) // ค้นหาชื่อแบบไม่สนพิมพ์เล็ก/ใหญ่
      
      users = usersByName
    }

    // เช็คกรณีฐานข้อมูลมีปัญหา
    if (!users) {
       return new Response(
         JSON.stringify({ error: 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล' }),
         { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       )
    }

    // --------------------------------------------------------------------------
    // STEP 3: วิเคราะห์ผลลัพธ์ที่เจอ
    // --------------------------------------------------------------------------
    
    // กรณี A: ไม่เจอใครเลย
    if (users.length === 0) {
      return new Response(
        JSON.stringify({ error: 'ชื่อผู้ใช้ หรือ รหัสพนักงานไม่ถูกต้อง' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // กรณี B: เจอมากกว่า 1 คน (ชื่อซ้ำกัน!) แจ้งให้ใช้รหัสพนักงาน
    if (users.length > 1) {
      return new Response(
        JSON.stringify({ 
          error: `มีพนักงานชื่อ "${users[0].employees_firstname}" ซ้ำกัน ${users.length} คน กรุณากรอกรหัสพนักงานแทนครับ` 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // กรณี C: เจอคนเดียว (Perfect!) -> ดึง User คนนั้นมา Login ต่อ
    const targetUser = users[0]

    // --------------------------------------------------------------------------
    // STEP 4: ทำการ Login ด้วย Auth Client
    // --------------------------------------------------------------------------
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { data, error: authError } = await supabaseClient.auth.signInWithPassword({
      email: targetUser.email,
      password: password, // ใช้ Password ที่ส่งมา (ซึ่งตกลงกันว่าเป็นรหัสพนักงาน)
    })

    // ถ้ารหัสผ่านผิด
    if (authError) {
      return new Response(
        JSON.stringify({ error: 'รหัสผ่าน (รหัสพนักงาน) ไม่ถูกต้อง' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Login สำเร็จ! คืนค่า session ให้หน้าบ้าน
    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    // ดัก Error ที่ไม่คาดคิด
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})