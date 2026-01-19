import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'

export const useUserStore = defineStore('user', {
  state: () => ({
    session: null,  // เก็บ Token และ User Auth
    profile: null,  // เก็บข้อมูลพนักงาน (Role, Name, etc.)
  }),

  actions: {
    // 1. เก็บ Session (ใช้ตอน Login สำเร็จ)
    setSession(session) {
      this.session = session
    },

    // 2. เก็บข้อมูล Profile (ใช้แบบ Manual ถ้าต้องการ)
    setProfile(data) {
      this.profile = data
    },

    // 3. ดึงข้อมูลพนักงานจาก Supabase (🔥🔥 พระเอกใหม่ของเรา)
    // ฟังก์ชันนี้จะดึงข้อมูลตาม Email ของ Session ปัจจุบัน
    async fetchUserProfile() {
      // ถ้าไม่มี Session หรือไม่มี Email ให้จบการทำงาน
      if (!this.session?.user?.email) return null

      try {
        const { data, error } = await supabase
          .from('employees')
          .select('*') // หรือจะระบุแค่ .select('id, name, role') ก็ได้
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

    // 4. ล้างข้อมูล (Logout)
    async clearSession() {
      await supabase.auth.signOut() // สั่ง Logout ที่ Supabase ด้วยเพื่อความชัวร์
      this.session = null
      this.profile = null
      // ถ้าใช้ persist บางทีต้องสั่ง clear storage ด้วย (แต่ปกติ pinia จัดการให้)
    },

    // 5. โหลดข้อมูลตอนเข้าเว็บใหม่ (Re-hydrate)
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
  // ต้องมั่นใจว่าลง npm install pinia-plugin-persistedstate แล้ว
  persist: true
})
