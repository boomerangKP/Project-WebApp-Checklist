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
    // 1. รับค่าจากหน้าบ้าน
    const { 
      email, 
      password, 
      role, 
      firstName, 
      lastName, 
      phone, 
      position, 
      code, 
      department, 
      gender, 
      status, 
      employees_photo, 
      notification_email 
    } = await req.json()

    // 2. สร้าง Client Admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 3. สร้าง User ใน Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      // ✅ เพิ่ม 2 บรรทัดนี้ครับ
      phone: phone,          // ส่งเบอร์โทรไปเก็บใน Auth
      phone_confirm: true,   // ยืนยันเบอร์ให้อัตโนมัติ (จะได้ไม่ติดสถานะรอ verified)
      
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role: role
      }
    })

    if (authError) throw authError

    const userId = authData.user.id

    // 4. บันทึกข้อมูลลงตาราง employees (✅ แก้ไขให้ตรง Schema)
    const { error: dbError } = await supabaseAdmin
      .from('employees')
      .insert([
        {
          // ❌ ไม่ต้องใส่ employees_id (Database สร้างให้เอง)
          auth_user_id: userId, // ✅ ใส่ UUID ตรงนี้แทน
          
          employees_code: code,
          employees_firstname: firstName,
          employees_lastname: lastName,
          employees_position: position,
          employees_department: department,
          employees_gender: gender,
          employees_phone: phone,
          employees_status: status || 'active',
          email: email,
          role: role,
          employees_photo: employees_photo,
          notification_email: notification_email,
          created_at: new Date()
        }
      ])

    if (dbError) {
        console.error('DB Insert Error:', dbError)
        // ลบ User ทิ้งถ้าลง DB ไม่สำเร็จ
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