import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useUserStore } from '@/stores/user'
import Swal from 'sweetalert2'
import { ROLES } from '@/constants/roles' // ✅ Import ROLES constant

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  // 1. Scroll Behavior (Fixes scrolling/zooming issues)
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0, behavior: 'smooth' } // Always scroll to top
    }
  },

  routes: [
    // --- 1. Login Page ---
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
      meta: { requiresAuth: true, role: ROLES.ADMIN },
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

    // --- 3. Maid Zone (Supports both maid and cleaner) ---
    {
      path: '/maid',
      component: () => import('../layouts/MaidLayout.vue'),
      meta: { requiresAuth: true, role: ROLES.MAID }, // Cleaner allowed via logic below
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
      ]
    },

    // --- 4. Public Routes (Scan Handler) ---
    {
      path: '/scan/:token',
      name: 'scan-handler',
      component: () => import('@/pages/maid/ScanHandler.vue'),
      meta: { requiresAuth: false }
    },

    // --- 5. Others ---
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

// --- Navigation Guard (Updated Logic) ---
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()
  const { data: { session } } = await supabase.auth.getSession()

  // 1. No Session (Not Logged In)
  if (!session) {
    // If route requires auth -> Redirect to Login
    if (to.meta.requiresAuth) return next('/login')
    // If Public route -> Allow
    return next()
  }

  // 2. Have Session but No Profile in Store (e.g., page refresh)
  if (!userStore.profile) {
    try {
      // ✅ Use centralized Action from Store
      await userStore.fetchUserProfile()

      // If fetch returns nothing (e.g., user deleted from employees table)
      if (!userStore.profile) {
        throw new Error('User profile not found')
      }
    } catch (err) {
      console.error('Auth Error:', err)
      await userStore.clearSession() // Clear session for safety
      return next('/login')
    }
  }

  const role = userStore.profile.role

  // 3. Prevent logged-in users from accessing Login page again
  if (to.path === '/login') {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
      }
    })

    Toast.fire({
      icon: 'info',
      title: 'คุณเข้าสู่ระบบอยู่แล้ว', // "You are already logged in"
      text: 'กำลังพาไปหน้าหลัก...' // "Redirecting to home..."
    })

    // Redirect based on Role (using Constants)
    if (role === ROLES.ADMIN) return next('/admin')
    if ([ROLES.MAID, ROLES.CLEANER].includes(role)) return next('/maid/home')
    return next('/')
  }

  // 4. Permission Check based on Route Meta Role
  if (to.meta.role) {
    // Admin Zone
    if (to.meta.role === ROLES.ADMIN && role !== ROLES.ADMIN) {
      return next('/login')
    }

    // Maid Zone (Allows Cleaner as well)
    if (to.meta.role === ROLES.MAID) {
      if (![ROLES.MAID, ROLES.CLEANER].includes(role)) {
        return next('/login')
      }
    }
  }

  next()
})

export default router
