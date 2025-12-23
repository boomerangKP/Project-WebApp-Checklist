import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '@/lib/supabase'
// 👇 1. Import Store (แต่ยังไม่เรียกใช้ข้างนอกนะ)
import { useUserStore } from '@/stores/user'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // --- 1. หน้า Login ---
    {
      path: '/login',
      name: 'login',
      component: () => import('../pages/auth/Login.vue'),
      meta: { requiresAuth: false }
    },

    // --- 2. Admin Zone ---
    {
      path: '/admin',
      component: () => import('../layouts/AdminLayout.vue'),
      meta: { requiresAuth: true, role: 'admin' }, // 👈 ระบุว่าต้องเป็น admin เท่านั้น
      children: [
        {
          path: '',
          name: 'admin-dashboard',
          component: () => import('../pages/admin/Dashboard.vue')
        },
        {
          path: 'check',
          name: 'check-tasks',
          component: () => import('../pages/admin/TaskCheck.vue')
        },
        {
          path: 'check/:id',
          name: 'task-detail',
          component: () => import('../pages/admin/TaskDetail.vue')
        },
        {
          path: 'employees',
          name: 'admin-employees',
          component: () => import('../pages/admin/EmployeeList.vue')
        },
        // ... (หน้าอื่นๆ ของ Admin)
      ]
    },

    // --- 3. Maid Zone ---
    {
      path: '/maid',
      component: () => import('../layouts/MaidLayout.vue'),
      meta: { requiresAuth: true, role: 'maid' }, // 👈 ระบุว่าต้องเป็น maid เท่านั้น
      children: [
        {
          path: 'home',
          name: 'maid-home',
          component: () => import('../pages/maid/Home.vue')
        },
        {
          path: 'manual-record',
          name: 'maid-manual-record',
          component: () => import('../pages/maid/ManualEntry.vue')
        },
        {
          path: 'history',
          name: 'maid-history',
          component: () => import('../pages/maid/History.vue')
        },
        
        // 👇 Redirect กันเหนียว ถ้าเข้า /maid เฉยๆ
        {
          path: '',
          redirect: { name: 'maid-home' }
        }
      ]
    },

    // --- 4. Root Redirect (สำคัญมาก!) ---
    // 👇👇👇 เพิ่มส่วนนี้ครับ: ถ้าเข้า localhost:5173 เฉยๆ ให้ดีดไป Login
    {
      path: '/',
      redirect: '/login'
    },

    // --- 5. NotFound (หน้ากันตาย) ---
    // 👇 ต้องอยู่ล่างสุดเสมอ!
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('../pages/NotFound.vue'),
      meta: { requiresAuth: false }
    }
  ]
})

// --- 🔥 Logic ยามเฝ้าประตู (Navigation Guard) ---
router.beforeEach(async (to, from, next) => {
  // 👇 เรียกใช้ Store ภายใน function นี้เท่านั้น (เพื่อป้องกัน Error: no active Pinia)
  const userStore = useUserStore()

  // 1. เช็ค Session ปัจจุบันจาก Supabase
  const { data: { session } } = await supabase.auth.getSession()

  // -----------------------------------------------------------
  // กรณี: ไม่มี Session (ยังไม่ได้ Login)
  // -----------------------------------------------------------
  if (!session) {
    // ถ้าจะไปหน้าที่ต้องการ Login -> ดีดไป Login
    if (to.meta.requiresAuth) {
      return next('/login')
    }
    // ถ้าไปหน้า Login หรือ NotFound -> ปล่อยผ่าน
    return next()
  }

  // -----------------------------------------------------------
  // กรณี: มี Session แล้ว (Login อยู่)
  // -----------------------------------------------------------

  // 2. เช็คว่ามีข้อมูล Profile ใน Store หรือยัง? (ถ้ากด Refresh หน้าเว็บ Store จะว่าง)
  let role = userStore.profile?.role

  if (!role) {
    // ถ้า Store ว่าง ให้วิ่งไปดึงจาก DB มาเก็บไว้เดี๋ยวนี้!
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*') // ดึงหมดเลยจะได้เอาไปใช้ในหน้าอื่นๆ ด้วย
        .eq('email', session.user.email)
        .single()

      if (!error && data) {
        userStore.setProfile(data) // เก็บลง Pinia
        role = data.role
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
    }
  }

  // 3. ป้องกันการกลับไปหน้า Login ซ้ำ (ถ้าล็อกอินแล้ว จะไปหน้า Login ทำไม?)
  if (to.path === '/login') {
    if (role === 'admin') return next('/admin')
    if (role === 'maid') return next('/maid/home')
    return next('/') // กันเหนียว
  }

  // 4. ป้องกันการข้ามสายงาน (Role Guard)
  // ถ้า Route นั้นระบุ role แต่ role ของ User ไม่ตรง
  if (to.meta.role && to.meta.role !== role) {
    // ดีดกลับไปหน้าบ้านของตัวเอง
    if (role === 'admin') return next('/admin')
    if (role === 'maid') return next('/maid/home')
    return next('/login') // ถ้าไม่มี role เลย ให้เด้งออก
  }

  // 5. ผ่านทุกด่าน เชิญครับ!
  next()
})

export default router