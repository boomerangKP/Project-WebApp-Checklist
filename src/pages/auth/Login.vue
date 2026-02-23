<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import Logo from '@/assets/Logo.png'
import {
  User,
  Lock,
  ArrowRight,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-vue-next'

const router = useRouter()
const userStore = useUserStore()

const username = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')
const showPassword = ref(false)

async function handleLogin() {
  if (loading.value) return

  loading.value = true
  errorMsg.value = ''

  try {
    const res = await userStore.login(username.value, password.value)

    if (!res.success) {
      throw new Error(res.error)
    }

    const employee = userStore.profile

    if (!employee) {
      await userStore.clearSession()
      throw new Error('ไม่พบข้อมูลพนักงานในระบบ')
    }

    if (employee.employees_status !== 'active') {
      await userStore.clearSession()
      throw new Error('บัญชีนี้ถูกระงับการใช้งาน')
    }

    const role = employee.role ? employee.role.toLowerCase() : 'user'

    if (['maid', 'cleaner'].includes(role)) {
      await router.replace({ name: 'maid-home' })
    } else {
      await router.replace('/admin')
    }

  } catch (err) {
    console.error('Login Error:', err)
    
    // ✅ โค้ดสั้นลงมาก! เอาข้อความภาษาไทยจาก Edge Function มาโชว์เลย
    const msg = err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่'
    
    if (msg.includes('network') || msg.includes('fetch')) {
      errorMsg.value = 'การเชื่อมต่อขัดข้อง กรุณาตรวจสอบอินเทอร์เน็ต'
    } else {
      errorMsg.value = msg // โชว์ข้อความจากหลังบ้านตรงๆ
    }
    
    if (!userStore.session) {
      await userStore.clearSession()
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans text-slate-600">

    <div class="mb-6 sm:mb-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-700 w-full max-w-md px-2">
      <img
        :src="Logo"
        alt="Smart Maid System"
        class="w-20 h-20 sm:w-24 sm:h-24 object-contain mx-auto mb-3 sm:mb-4 drop-shadow-sm hover:scale-105 transition-transform duration-300"
      />
      <h1 class="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800 tracking-tight leading-tight">
        ระบบบริหารจัดการสุขอนามัยอาคาร
      </h1>
      <p class="text-xs sm:text-sm text-slate-500 mt-1.5 sm:mt-2">
        Building Hygiene Management System | Princ Ubon
      </p>
    </div>

    <div class="w-full max-w-sm sm:max-w-md bg-white rounded-2xl shadow-sm sm:shadow-md border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-500 delay-150">
      
      <div class="p-6 sm:p-8 md:p-10">
        <h2 class="text-lg sm:text-xl font-bold text-slate-700 mb-6 flex items-center gap-2">
          เข้าสู่ระบบ
        </h2>

        <form @submit.prevent="handleLogin" class="space-y-4 sm:space-y-5">
          <div v-if="errorMsg" class="bg-rose-50 border border-rose-100 text-rose-600 p-3 sm:p-4 rounded-xl text-xs sm:text-sm flex items-start gap-2.5 sm:gap-3 animate-in shake">
            <AlertCircle class="w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5" />
            <span class="font-medium leading-relaxed">{{ errorMsg }}</span>
          </div>

          <div class="space-y-1.5">
            <label class="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">ชื่อผู้ใช้ (Firstname)</label>
            <div class="relative group">
              <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <User class="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              </div>
              <input
                v-model="username"
                type="text"
                required
                @keyup.enter="handleLogin"
                class="block w-full pl-10 sm:pl-11 pr-4 py-2.5 sm:py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
                placeholder="กรอกชื่อจริง หรือ รหัสพนักงาน"
              >
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">รหัสผ่าน (Password)</label>
            <div class="relative group">
              <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Lock class="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              </div>

              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                required
                @keyup.enter="handleLogin"
                class="block w-full pl-10 sm:pl-11 pr-12 py-2.5 sm:py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
                placeholder="กรอกรหัสพนักงาน"
              >

              <button
                v-show="password"
                type="button"
                @click="showPassword = !showPassword"
                class="absolute inset-y-0 right-0 pr-3 sm:pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none transition-all animate-in fade-in zoom-in-95 duration-200"
                tabindex="-1"
              >
                <Eye v-if="!showPassword" class="h-4 w-4 sm:h-5 sm:w-5" />
                <EyeOff v-else class="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full flex justify-center items-center gap-2 py-3 sm:py-3.5 px-4 border border-transparent rounded-xl shadow-md shadow-indigo-200 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed disabled:shadow-none transition-all mt-6 active:scale-[0.98]"
          >
            <Loader2 v-if="loading" class="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
            <span v-else>เข้าใช้งานระบบ</span>
            <ArrowRight v-if="!loading" class="w-4 h-4" />
          </button>
        </form>
      </div>

      <div class="bg-slate-50 p-3 sm:p-4 border-t border-slate-100 text-center">
        <p class="text-[10px] sm:text-xs text-slate-400">© 2025 Princ Hospital Ubon Ratchathani</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shake {
  animation: shake 0.82s cubic-bezier(.36,.07,.19,.97) both;
}

@keyframes shake {
  10%, 90% { transform: translate3d(-1px, 0, 0); }
  20%, 80% { transform: translate3d(2px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
  40%, 60% { transform: translate3d(4px, 0, 0); }
}
</style>