// supabase/functions/update-employee/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')

    // 🛡️ SECURITY CHECK
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // --- เริ่มทำงาน ---
    // ✅ 1. รับค่า firstName, lastName เพิ่ม
    const { userId, email, password, role, firstName, lastName } = await req.json()

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const updateData: any = {}
    if (email) updateData.email = email
    if (password) updateData.password = password

    // ✅ 2. รวมข้อมูล Metadata (Role + ชื่อ)
    const metadata: any = {}
    if (role) metadata.role = role
    if (firstName) metadata.first_name = firstName
    if (lastName) metadata.last_name = lastName

    // ถ้ามีข้อมูลใหม่ใน metadata ให้ใส่เข้าไปใน updateData
    if (Object.keys(metadata).length > 0) {
        updateData.user_metadata = metadata
    }

    // อัปเดต User ใน Auth
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      updateData
    )

    if (error) throw error

    return new Response(JSON.stringify({ message: 'Updated' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})