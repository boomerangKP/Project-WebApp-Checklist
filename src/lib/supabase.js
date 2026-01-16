import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// ✅ แก้ไข: เพิ่ม config auth ให้ใช้ sessionStorage
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: sessionStorage, // 👈 เปลี่ยนเป็น sessionStorage (ปิดแท็บ = ลบ)
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})