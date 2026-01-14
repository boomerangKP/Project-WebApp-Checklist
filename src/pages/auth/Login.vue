<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useUserStore } from '@/stores/user'
import Logo from '@/assets/Logo.png'
import {
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Loader2
} from 'lucide-vue-next'

const router = useRouter()
const userStore = useUserStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

async function handleLogin() {
  loading.value = true
  errorMsg.value = ''

  try {
    const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value
    })

    if (authError) throw authError

    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('*')
      .eq('email', email.value)
      .single()

    if (empError || !employee) {
      await supabase.auth.signOut()
      throw new Error('ไม่พบข้อมูลพนักงานในระบบ')
    }

    if (employee.employees_status !== 'active') {
      await supabase.auth.signOut()
      throw new Error('บัญชีนี้ถูกระงับการใช้งาน')
    }

    // Save to Pinia
    if (userStore.setSession) userStore.setSession(session)
    if (userStore.setProfile) userStore.setProfile(employee)

    // Redirect
    if (employee.role === 'maid') {
      router.push({ name: 'maid-home' })
    } else {
      router.push('/admin')
    }

  } catch (err) {
    console.error('Login Error:', err)
    if (err.message.includes('Invalid login') || err.message.includes('invalid_grant')) {
      errorMsg.value = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
    } else if (err.message.includes('network')) {
      errorMsg.value = 'การเชื่อมต่อขัดข้อง กรุณาตรวจสอบอินเทอร์เน็ต'
    } else {
      errorMsg.value = err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans text-slate-600">

    <div class="mb-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">

      <img
        :src="Logo"
        alt="Smart Maid System"
        class="w-24 h-24 object-contain mx-auto mb-4 drop-shadow-sm hover:scale-105 transition-transform duration-300"
      />

      <h1 class="text-2xl font-bold text-slate-800 tracking-tight">ระบบบริหารจัดการสุขอนามัยอาคาร</h1>
      <p class="text-sm text-slate-500 mt-1">Building Hygiene Management System | Princ Ubon</p>
    </div>

    <div class="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-500 delay-150">
      <div class="p-8">
        <h2 class="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2">
          เข้าสู่ระบบ
        </h2>

        <form @submit.prevent="handleLogin" class="space-y-5">
          <div v-if="errorMsg" class="bg-rose-50 border border-rose-100 text-rose-600 p-3 rounded-xl text-sm flex items-start gap-3 animate-in shake">
            <AlertCircle class="w-5 h-5 shrink-0 mt-0.5" />
            <span class="font-medium">{{ errorMsg }}</span>
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">อีเมล</label>
            <div class="relative group">
              <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Mail class="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              </div>
              <input
                v-model="email"
                type="email"
                required
                class="block w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
                placeholder="user@example.com"
              >
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">รหัสผ่าน</label>
            <div class="relative group">
              <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Lock class="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              </div>
              <input
                v-model="password"
                type="password"
                required
                class="block w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
                placeholder="••••••••"
              >
            </div>
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-md shadow-indigo-200 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed disabled:shadow-none transition-all mt-4 active:scale-[0.98]"
          >
            <Loader2 v-if="loading" class="w-5 h-5 animate-spin" />
            <span v-else>เข้าใช้งานระบบ</span>
            <ArrowRight v-if="!loading" class="w-4 h-4" />
          </button>
        </form>
      </div>

      <div class="bg-slate-50 p-4 border-t border-slate-100 text-center">
        <p class="text-xs text-slate-400">© 2024 Princ Hospital Ubon Ratchathani</p>
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
