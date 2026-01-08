import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '@/lib/supabase'
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
      meta: { requiresAuth: true, role: 'admin' },
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
          path: 'report',
          name: 'admin-report',
          component: () => import('../pages/admin/Reports.vue')
        },
        {
          path: 'employees',
          name: 'admin-employees',
          component: () => import('../pages/admin/EmployeeList.vue')
        },
        {
          path: 'locations',
          name: 'admin-locations',
          component: () => import('../pages/admin/LocationManagement.vue')
        },
        {
          path: 'checklists',
          name: 'admin-checklists',
          component: () => import('../pages/admin/Checklists.vue')
        },
        {
          path: 'qrcodeprinter',
          name: 'admin-qrcodeprinter',
          component: () => import('../pages/admin/QRCodePrinter.vue')
        },
        {
          path: 'editfeedback',
          name: 'admin-editfeedback',
          component: () => import('../pages/admin/EditFeedback.vue')
        },
        {
          path: 'satisfaction',
          name: 'report-satisfaction',
          component: () => import('../pages/admin/ReportSatisfaction.vue')
        }
      ]
    },

    // --- 3. Maid Zone ---
    {
      path: '/maid',
      component: () => import('../layouts/MaidLayout.vue'),
      meta: { requiresAuth: true, role: 'maid' },
      children: [
        {
          path: 'home',
          name: 'maid-home',
          component: () => import('../pages/maid/MaidHome.vue')
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
        {
          path: '/maid/scan',
          name: 'maid-scan',
          component: () => import('@/pages/maid/ScanQR.vue')
        }
        // ❌ เอา /scan/:token ออกจากตรงนี้ เพราะตรงนี้บังคับ Login
      ]
    },

    // --- 🔥 4. Public Routes (Scan Handler) ---
    // ✅ ย้ายมาไว้ตรงนี้ เพื่อให้ใครก็เข้าได้ (แล้วค่อยไปเช็ค Role ข้างในไฟล์)
    {
      path: '/scan/:token',
      name: 'scan-handler',
      component: () => import('@/pages/maid/ScanHandler.vue'),
      meta: { requiresAuth: false } // เปิด Public
    },

    // --- 5. อื่นๆ ---
    {
      path: '/',
      redirect: '/login'
    },
    {
      path: '/feedback/:id',
      name: 'feedback',
      component: () => import('@/pages/customer/Feedback.vue')
    },
    {
      path: '/maid/job/:id',
      name: 'maid-job',
      component: () => import('@/pages/maid/JobSubmit.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('../pages/NotFound.vue'),
      meta: { requiresAuth: false }
    }
  ]
})

router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()
  const { data: { session } } = await supabase.auth.getSession()

  // 1. ไม่มี Session -> ดีดไป Login (ยกเว้นหน้าที่เปิด Public)
  if (!session) {
    if (to.meta.requiresAuth) return next('/login')
    return next()
  }

  // 2. มี Session -> เช็ค Role
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

  if (to.path === '/login') {
    if (role === 'admin') return next('/admin')
    if (role === 'maid') return next('/maid/home')
    return next('/')
  }

  if (to.meta.role && to.meta.role !== role) {
    if (role === 'admin') return next('/admin')
    if (role === 'maid') return next('/maid/home')
    return next('/login')
  }

  next()
})

export default router
