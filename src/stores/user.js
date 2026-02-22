import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'

export const useUserStore = defineStore('user', {
  state: () => ({
    session: null,  // เก็บ Token และ User Auth
    profile: null,  // เก็บข้อมูลพนักงาน (Role, Name, Photo, etc.)
  }),

  actions: {
    // --- 1. ฟังก์ชัน Login (เพิ่มใหม่เพื่อรองรับ Username) ---
    async login(username, password) {
      try {
        // เรียก Edge Function 'login-with-username' ที่เราสร้างไว้
        const { data, error } = await supabase.functions.invoke('login-with-username', {
          body: { username, password }
        })

        if (error) throw error
        if (!data || !data.session) throw new Error(data?.error || 'เข้าสู่ระบบไม่สำเร็จ')

        // ตั้งค่า Session ให้ Supabase Client ฝั่งหน้าบ้าน (สำคัญมาก)
        const { error: sessionError } = await supabase.auth.setSession(data.session)
        if (sessionError) throw sessionError

        // อัปเดต State
        this.session = data.session

        // ดึงข้อมูล Profile ต่อทันที
        await this.fetchUserProfile()
        
        return { success: true }
      } catch (err) {
        console.error('Login Error:', err)
        return { success: false, error: err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' }
      }
    },

    // --- 2. เก็บ Session (Helper) ---
    setSession(session) {
      this.session = session
    },

    // --- 3. เก็บข้อมูล Profile (Helper) ---
    setProfile(data) {
      this.profile = data
    },

    // --- 4. ดึงข้อมูลพนักงานจาก Supabase ---
    async fetchUserProfile() {
      // ถ้าไม่มี Session หรือไม่มี Email ให้จบการทำงาน
      if (!this.session?.user?.email) return null

      try {
        const { data, error } = await supabase
          .from('employees')
          .select(`
            employees_id,
            employees_code,
            employees_firstname,
            employees_lastname,
            employees_gender,
            employees_position,
            employees_department,
            employees_phone,
            employees_status,
            role,
            email,
            notification_email,
            employees_photo
          `)
          .eq('email', this.session.user.email)
          .single()

        if (error) {
          console.error('Error fetching profile:', error)
          return null
        }

        // ถ้าเจอข้อมูล ให้อัปเดตเข้า State ทันที
        if (data) {
          this.profile = data
          return data
        }
      } catch (err) {
        console.error('Unexpected error:', err)
        return null
      }
    },

    // --- 5. ล้างข้อมูล (Logout) ---
    async clearSession() {
      await supabase.auth.signOut() // สั่ง Logout ที่ Supabase ด้วย
      this.session = null
      this.profile = null
      // เคลียร์ LocalStorage ที่ Pinia Persist เก็บไว้ (ชื่อ 'user' มาจาก id ของ store)
      localStorage.removeItem('user') 
    },

    // --- 6. โหลดข้อมูลตอนเข้าเว็บใหม่ (Re-hydrate) ---
    async loadSession() {
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        this.session = session
        // เรียกใช้ฟังก์ชันพระเอกของเรา เพื่อดึง Role/Profile ล่าสุด
        await this.fetchUserProfile()
      }
    }
  },

  // ✅ เปิดใช้งาน Persistence (จำข้อมูลแม้รีเฟรชหน้า)
  persist: true
})