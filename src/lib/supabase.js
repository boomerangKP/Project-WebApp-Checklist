import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// ✅ แก้ไข: ลบ config auth ออก เพื่อให้กลับไปใช้ localStorage (ค่า default)
// User จะได้ไม่หลุดตอนปิดแท็บ หรือ Refresh หน้าจอ
export const supabase = createClient(supabaseUrl, supabaseKey)
