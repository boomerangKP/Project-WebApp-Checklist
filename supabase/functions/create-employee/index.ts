// supabase/functions/create-employee/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 🛡️ 1. SECURITY CHECK: ตรวจสอบว่ามี Token ส่งมาไหม
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    // 1. รับค่าจากหน้าบ้าน (🚨 ลบ phone ออกแล้ว)
    const {
      email,
      password,
      role,
      firstName,
      lastName,
      position,
      code,
      department,
      gender,
      status,
      employees_photo
    } = await req.json()

    // 2. สร้าง Client Admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 🛡️ 2. SECURITY CHECK: ตรวจสอบความถูกต้องของ User (ต้อง Login แล้วเท่านั้น)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: กรุณาเข้าสู่ระบบ' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 🚨 (ลบโค้ดแปลงและจัดการเบอร์โทรศัพท์ทิ้งไปแล้ว)

    // 3. สร้าง User ใน Auth (ส่งแค่อีเมล, รหัสผ่าน และข้อมูล Metadata)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role: role
      }
    })

    if (authError) throw authError

    const userId = authData.user.id

    // 4. บันทึกข้อมูลลงตาราง employees (🚨 ลบ employees_phone ออกแล้ว)
    const { error: dbError } = await supabaseAdmin
      .from('employees')
      .insert([
        {
          auth_user_id: userId, // ✅ ใส่ UUID
          employees_code: code,
          employees_firstname: firstName,
          employees_lastname: lastName,
          employees_position: position,
          employees_department: department,
          employees_gender: gender,
          employees_status: status || 'active',
          email: email,
          role: role,
          employees_photo: employees_photo,
          created_at: new Date()
        }
      ])

    if (dbError) {
        console.error('DB Insert Error:', dbError)
        // ลบ User ทิ้งถ้าลง DB ไม่สำเร็จ เพื่อไม่ให้ข้อมูลขยะค้างใน Auth
        await supabaseAdmin.auth.admin.deleteUser(userId)
        throw new Error(`Database error: ${dbError.message}`)
    }

    return new Response(
      JSON.stringify({ message: 'Success', userId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )

  } catch (error) {
    console.error('Function Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})