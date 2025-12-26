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
        // 🔥🔥🔥 เพิ่มส่วนนี้ครับ (หน้ารายงาน) 🔥🔥🔥
        {
          path: 'report', // ตรงกับใน Sidebar เป๊ะ
          name: 'admin-report',
          component: () => import('../pages/admin/Reports.vue')
        },
        // 🔥🔥🔥 จบส่วนที่เพิ่ม 🔥🔥🔥
        {
          path: 'employees',
          name: 'admin-employees',
          component: () => import('../pages/admin/EmployeeList.vue')
        },
        // 🔥 เปลี่ยนจาก path: 'settings' เป็น 2 อันนี้แทน
        {
          path: 'locations',  // ตรงกับ Sidebar ที่ตั้งไว้
          name: 'admin-locations',
          component: () => import('../pages/admin/Locations.vue')
        },
        {
          path: 'checklists', // ตรงกับ Sidebar ที่ตั้งไว้
          name: 'admin-checklists',
          component: () => import('../pages/admin/Checklists.vue')
        }
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
        {
          path: 'history/:id',
          name: 'maid-history-detail',
          component: () => import('../pages/maid/TaskHistoryDetail.vue')
        },
        {
          path: '',
          redirect: { name: 'maid-home' }
        },
        // ใน children ของ path: '/admin'

      ]
    },

    // --- 4. Root Redirect ---
    {
      path: '/',
      redirect: '/login'
    },

    // --- 5. NotFound ---
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('../pages/NotFound.vue'),
      meta: { requiresAuth: false }
    },
  ]
})

// --- 🔥 Logic ยามเฝ้าประตู (Navigation Guard) ---
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()
  const { data: { session } } = await supabase.auth.getSession()

  // 1. ไม่มี Session -> ดีดไป Login
  if (!session) {
    if (to.meta.requiresAuth) return next('/login')
    return next()
  }

  // 2. มี Session -> เช็ค Role ใน Store
  let role = userStore.profile?.role

  if (!role) {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('email', session.user.email)
        .single()

      if (!error && data) {
        userStore.setProfile(data)
        role = data.role
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
    }
  }

  // 3. ป้องกันกลับไปหน้า Login ซ้ำ
  if (to.path === '/login') {
    if (role === 'admin') return next('/admin')
    if (role === 'maid') return next('/maid/home')
    return next('/')
  }

  // 4. ป้องกันข้ามสายงาน (Role Guard)
  if (to.meta.role && to.meta.role !== role) {
    if (role === 'admin') return next('/admin')
    if (role === 'maid') return next('/maid/home')
    return next('/login')
  }

  next()
})

export default router
