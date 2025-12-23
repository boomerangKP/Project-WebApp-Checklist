import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase' // import supabase เพื่อใช้ใน loadSession

export const useUserStore = defineStore('user', {
  state: () => ({
    session: null,  // เก็บ Token
    profile: null,  // เก็บข้อมูลพนักงาน
  }),
  actions: {
    // 1. เก็บ Session
    setSession(session) {
      this.session = session
    },

    // 2. เก็บข้อมูลพนักงาน (นี่คือตัวที่ Error ก่อนหน้านี้)
    setProfile(data) {
      this.profile = data
    },

    // 3. ล้างข้อมูล (Logout)
    clearSession() {
      this.session = null
      this.profile = null
    },

    // 4. โหลดข้อมูลตอนเข้าเว็บใหม่ (Persistent)
    async loadSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        this.session = session
        // ดึง Profile ล่าสุด
        const { data: employee } = await supabase
          .from('employees')
          .select('*')
          .eq('email', session.user.email)
          .single()
        
        if (employee) {
          this.profile = employee
        }
      }
    }
  },
  // ถ้าลง pinia-plugin-persistedstate ให้เปิดบรรทัดนี้
  // persist: true 
})